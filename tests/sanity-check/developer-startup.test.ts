import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dependenciesMatchLock } from '../../scripts/dev.js';

const locked = {
  packages: {
    '': { version: '1.0.0' },
    'node_modules/api': { version: '1.2.3', integrity: 'api-v1' },
    'node_modules/tool': { version: '4.5.6', integrity: 'tool-v4' },
    'node_modules/platform-tool': { version: '4.5.6', optional: true },
  },
};

describe('developer setup detection', () => {
  it('should retain a matching install without platform-specific optional packages', () => {
    expect(
      dependenciesMatchLock(locked, {
        packages: {
          'node_modules/api': { version: '1.2.3', integrity: 'api-v1' },
          'node_modules/tool': { version: '4.5.6', integrity: 'tool-v4' },
        },
      }),
    ).toBe(true);
  });

  describe('developer startup entry point', () => {
    it('should reject invalid or overlapping ports before starting Docker or installing packages', () => {
      for (const overrides of [
        { DEV_API_PORT: 'not-a-port' },
        { DEV_API_PORT: '65536' },
        { DEV_API_PORT: '5173', DEV_UI_PORT: '5173' },
      ]) {
        const result = spawnSync(process.execPath, ['scripts/dev.js'], {
          encoding: 'utf8',
          env: {
            ...process.env,
            DEV_DB_PORT: '5433',
            DEV_API_PORT: '3000',
            DEV_UI_PORT: '5173',
            ...overrides,
          },
        });
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/must be (an integer|distinct)/);
        expect(result.stdout).not.toContain('Database project:');
      }
    });
  });

  it('should require setup for missing or stale locked dependencies', () => {
    const packages = {
      'node_modules/api': { version: '1.2.3', integrity: 'api-v1' },
    };
    expect(dependenciesMatchLock(locked, { packages })).toBe(false);
    expect(
      dependenciesMatchLock(locked, {
        packages: {
          ...packages,
          'node_modules/tool': { version: '4.5.5', integrity: 'tool-v3' },
        },
      }),
    ).toBe(false);
  });

  it('should require setup for altered package content or extraneous dependencies', () => {
    expect(
      dependenciesMatchLock(locked, {
        packages: {
          ...locked.packages,
          'node_modules/tool': { version: '4.5.6', integrity: 'altered' },
        },
      }),
    ).toBe(false);
    expect(
      dependenciesMatchLock(locked, {
        packages: {
          ...locked.packages,
          'node_modules/extra': { version: '1' },
        },
      }),
    ).toBe(false);
  });
});
