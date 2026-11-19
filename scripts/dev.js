import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function dependenciesMatchLock(expected, installed) {
  const wanted = expected.packages;
  const actual = installed.packages;
  if (!wanted || !actual) return false;
  return (
    Object.entries(wanted).every(
      ([path, entry]) =>
        path === '' ||
        (!actual[path] && entry.optional) ||
        (actual[path]?.version === entry.version &&
          actual[path]?.integrity === entry.integrity),
    ) && Object.keys(actual).every((path) => path === '' || wanted[path])
  );
}

function port(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`${name} must be an integer from 1 to 65535.`);
  }
  return Number(value);
}

async function assertPortAvailable(value, host = '127.0.0.1') {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', () =>
      reject(
        new Error(`Port ${value} is occupied. Choose another DEV_*_PORT.`),
      ),
    );
    server.listen(value, host, resolve);
  });
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function main() {
  if (process.versions.node.split('.')[0] !== '24') {
    throw new Error(
      'Developer mode requires Node 24 (including native TypeScript support).',
    );
  }
  if (process.platform === 'win32') {
    throw new Error(
      'Run developer mode in macOS, Linux or WSL with Docker integration.',
    );
  }
  const mode = process.argv[2];
  if (
    process.argv.length > 3 ||
    (mode && !['--setup', '--stop-db'].includes(mode))
  ) {
    throw new Error('Usage: node scripts/dev.js [--setup | --stop-db]');
  }
  const dbPort = port('DEV_DB_PORT', '5433');
  const apiPort = port('DEV_API_PORT', '3000');
  const uiPort = port('DEV_UI_PORT', '5173');
  if (new Set([dbPort, apiPort, uiPort]).size !== 3) {
    throw new Error(
      'DEV_DB_PORT, DEV_API_PORT and DEV_UI_PORT must be distinct.',
    );
  }
  const project = `material-register-dev-${createHash('sha256').update(root).digest('hex').slice(0, 10)}`;
  const env = {
    ...process.env,
    DEV_DB_PORT: String(dbPort),
    DEV_API_PORT: String(apiPort),
    DEV_UI_PORT: String(uiPort),
    PGHOST: '127.0.0.1',
    PGPORT: String(dbPort),
    PGDATABASE: 'material_register',
    PGUSER: 'material_register',
    PGPASSWORD: 'material_register_local',
    PGSSLMODE: 'disable',
    PORT: String(apiPort),
  };
  const compose = [
    'compose',
    '-p',
    project,
    '-f',
    'docker/compose-db.yml',
    '-f',
    'docker/compose-dev.yml',
  ];
  const children = new Set();
  const services = new Set();
  const terminating = new Set();
  let stopping = false;

  function signalChild(child, signal) {
    if (!child.pid) return;
    if (signal === 'SIGTERM' && terminating.has(child)) return;
    try {
      // Separate process groups also stop Node watch's API subprocess.
      process.kill(-child.pid, signal);
      if (signal === 'SIGTERM') terminating.add(child);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }

  function start(command, args, quiet = false) {
    if (stopping) throw new Error('Startup interrupted.');
    const child = spawn(command, args, {
      cwd: root,
      env,
      detached: true,
      stdio: quiet ? 'ignore' : 'inherit',
    });
    children.add(child);
    child.done = new Promise((resolve) => {
      child.once('error', (error) => {
        children.delete(child);
        resolve({ error });
      });
      child.once('exit', (code, signal) => {
        children.delete(child);
        resolve({ code, signal });
      });
    });
    return child;
  }

  async function run(command, args, quiet = false) {
    const result = await start(command, args, quiet).done;
    if (result.error) throw result.error;
    if (result.code !== 0) {
      throw new Error(
        `${command} ${args.join(' ')} failed (${result.signal ?? result.code}).`,
      );
    }
  }

  const interrupt = (signal) => {
    stopping = true;
    process.exitCode = signal === 'SIGINT' ? 130 : 143;
    for (const child of new Set([...children, ...services])) {
      signalChild(child, 'SIGTERM');
    }
  };
  const onInterrupt = () => interrupt('SIGINT');
  const onTerminate = () => interrupt('SIGTERM');
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);

  try {
    console.info(`[dev] Database project: ${project}; host port: ${dbPort}`);
    await run('docker', ['info', '--format', '{{.ServerVersion}}']);
    if (mode === '--stop-db') {
      await run('docker', [...compose, 'down']);
      return;
    }
    if (mode !== '--setup') {
      await assertPortAvailable(apiPort, '0.0.0.0');
      await assertPortAvailable(uiPort);
    }
    const expected = await readJson('package-lock.json');
    const installed = await readJson('node_modules/.package-lock.json');
    const lockMatches =
      expected && installed && dependenciesMatchLock(expected, installed);
    const tree = lockMatches
      ? await start('npm', ['ls', '--all', '--silent'], true).done
      : null;
    if (!lockMatches || tree?.code !== 0) {
      if (tree?.error) throw tree.error;
      console.info(
        '[dev] Dependencies missing or out of date; running npm ci.',
      );
      await run('npm', ['ci', '--include=dev', '--include=optional']);
    } else {
      console.info(
        '[dev] Dependencies match package-lock.json; keeping node_modules.',
      );
    }
    await run('docker', [
      ...compose,
      'up',
      '--build',
      '--wait',
      '--wait-timeout',
      '90',
      'db',
    ]);
    await run(process.execPath, ['src/db/migrate.ts']);
    await run(process.execPath, ['src/db/seed.ts']);
    if (mode === '--setup') {
      console.info(
        '[dev] Setup complete. Run npm run dev to start API and UI.',
      );
      return;
    }
    const api = start(process.execPath, ['--watch', 'src/api/server.ts']);
    const ui = start(process.execPath, [
      'node_modules/vite/bin/vite.js',
      '--config',
      'vite.config.ts',
    ]);
    services.add(api);
    services.add(ui);
    const exited = Promise.race([api.done, ui.done]).then((result) => {
      if (result.error) throw result.error;
      throw new Error(
        `A development process exited (${result.signal ?? result.code}).`,
      );
    });
    const origin = `http://127.0.0.1:${uiPort}`;
    await Promise.race([
      exited,
      (async () => {
        let lastError;
        for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
          try {
            const page = await fetch(`${origin}/materials`, {
              signal: AbortSignal.timeout(1000),
            });
            const apiResponse = await fetch(`${origin}/api/trpc/plants.list`, {
              signal: AbortSignal.timeout(1000),
            });
            if (!page.ok || !apiResponse.ok)
              throw new Error(`UI ${page.status}, API ${apiResponse.status}`);
            return;
          } catch (error) {
            lastError = error;
            await delay(500);
          }
        }
        throw new Error(
          `UI/API readiness failed: ${lastError?.message ?? 'interrupted'}`,
        );
      })(),
    ]);
    console.info(
      `[dev] Ready: ${origin}/materials\n[dev] API :${apiPort} (Node watch), UI :${uiPort} (Vite HMR). Ctrl+C stops both; database is retained.`,
    );
    await exited;
  } catch (error) {
    if (!stopping) throw error;
  } finally {
    stopping = true;
    const remaining = [...new Set([...children, ...services])];
    for (const child of remaining) signalChild(child, 'SIGTERM');
    await Promise.race([
      Promise.all(remaining.map((child) => child.done)),
      delay(4000, undefined, { ref: false }),
    ]);
    for (const child of children) signalChild(child, 'SIGKILL');
    process.off('SIGINT', onInterrupt);
    process.off('SIGTERM', onTerminate);
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    console.error(`[dev] ${error.message}`);
    process.exitCode = 1;
  });
}
