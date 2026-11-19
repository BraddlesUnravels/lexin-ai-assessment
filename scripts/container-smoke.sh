#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(CDPATH= cd -- "$script_dir/.." && pwd)
compose="$root/scripts/compose.sh"
project="material-register-smoke-$(date +%s)-$$"
port=${SMOKE_UI_PORT:-}
timeout=${SMOKE_TIMEOUT_SECONDS:-180}

if ! printf '%s' "$timeout" | grep -Eq '^[1-9][0-9]*$'; then
  echo "SMOKE_TIMEOUT_SECONDS must be a positive integer." >&2
  exit 2
fi

if [ -z "$port" ]; then
  port=$(node --input-type=module -e '
    import net from "node:net";
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      console.log(server.address().port);
      server.close();
    });
  ')
fi

if ! printf '%s' "$port" | grep -Eq '^[1-9][0-9]{0,4}$' || [ "$port" -gt 65535 ]; then
  echo "SMOKE_UI_PORT must be a port number from 1 to 65535." >&2
  exit 2
fi

if ! node --input-type=module - "$port" <<'NODE'
import net from 'node:net';

const port = Number(process.argv[2]);
const server = net.createServer();
server.once('error', () => process.exit(1));
server.listen(port, '127.0.0.1', () => server.close());
NODE
then
  echo "SMOKE_UI_PORT $port is already in use." >&2
  exit 2
fi

cleanup() {
  status=$?
  trap - EXIT

  if [ "$status" -ne 0 ]; then
    UI_PORT="$port" "$compose" -p "$project" logs --no-color || true
  fi

  if ! UI_PORT="$port" "$compose" -p "$project" down --volumes --remove-orphans; then
    echo "Failed to clean up smoke project $project." >&2
    [ "$status" -ne 0 ] || status=1
  fi

  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

UI_PORT="$port" "$compose" -p "$project" config --quiet
UI_PORT="$port" "$compose" -p "$project" up --build --detach

url="http://127.0.0.1:$port"
deadline=$(($(date +%s) + timeout))
document=
while [ "$(date +%s)" -lt "$deadline" ]; do
  document=$(curl --silent --show-error --fail "$url/materials" 2>/dev/null || true)
  if printf '%s' "$document" | grep -Fq '<div id="root"></div>'; then
    break
  fi
  sleep 2
done

if ! printf '%s' "$document" | grep -Fq '<div id="root"></div>'; then
  echo "Timed out waiting for the UI deep link at $url/materials." >&2
  exit 1
fi

response=
while [ "$(date +%s)" -lt "$deadline" ]; do
  response=$(curl --silent --show-error --fail \
    "$url/api/trpc/smoke.check?input=%7B%22probe%22%3A%22container-smoke%22%7D" 2>/dev/null || true)
  if [ -n "$response" ]; then
    break
  fi
  sleep 2
done

if [ -z "$response" ]; then
  echo "Timed out waiting for the tRPC smoke procedure through the UI proxy." >&2
  exit 1
fi

node --input-type=module - "$response" <<'NODE'
const response = JSON.parse(process.argv[2]);
const result = response.result?.data?.json ?? response.result?.data;
const expected = {
  ok: true,
  service: 'api',
  probe: 'container-smoke',
};

if (JSON.stringify(result) !== JSON.stringify(expected)) {
  console.error('Unexpected tRPC smoke response:', JSON.stringify(response));
  process.exit(1);
}
NODE

echo "Container smoke passed at $url/materials (project $project)."
