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

plants_response=
materials_response=
fixture_response=
while [ "$(date +%s)" -lt "$deadline" ]; do
  plants_response=$(curl --silent --show-error --fail \
    "$url/api/trpc/plants.list" 2>/dev/null || true)
  materials_response=$(curl --silent --show-error --fail -G \
    "$url/api/trpc/materials.list" \
    --data-urlencode \
    'input={"search":"bearing","status":"Active","materialType":"Spare Part","plantCode":"4000","page":2}' \
    2>/dev/null || true)
  fixture_response=$(curl --silent --show-error --fail -G \
    "$url/api/trpc/materials.list" \
    --data-urlencode 'input={"search":"MAT-000123","plantCode":"4000"}' \
    2>/dev/null || true)
  if [ -n "$plants_response" ] &&
    [ -n "$materials_response" ] &&
    [ -n "$fixture_response" ]; then
    break
  fi
  sleep 2
done

if [ -z "$plants_response" ] ||
  [ -z "$materials_response" ] ||
  [ -z "$fixture_response" ]; then
  echo "Timed out waiting for plants.list and materials.list through the UI proxy." >&2
  exit 1
fi

node --input-type=module - \
  "$plants_response" "$materials_response" "$fixture_response" <<'NODE'
const [plantsResponse, materialsResponse, fixtureResponse] =
  process.argv.slice(2).map((body) => JSON.parse(body));

function getData(response) {
  const data = response.result?.data;
  return data?.json ?? data;
}

const plants = getData(plantsResponse);
if (
  !Array.isArray(plants) ||
  !plants.some(
    (plant) =>
      plant.plantCode === '4000' &&
      plant.name === 'Brisbane Service Warehouse' &&
      plant.city === 'Brisbane',
  )
) {
  console.error('Unexpected plants.list response:', JSON.stringify(plantsResponse));
  process.exit(1);
}

const page = getData(materialsResponse);
if (
  !page ||
  page.page !== 2 ||
  page.pageSize !== 25 ||
  !Number.isInteger(page.total) ||
  page.total < 76 ||
  !Array.isArray(page.rows) ||
  page.rows.length !== 25
) {
  console.error(
    'Unexpected filtered materials.list response:',
    JSON.stringify(materialsResponse),
  );
  process.exit(1);
}

const fixturePage = getData(fixtureResponse);
const fixture = fixturePage?.rows?.[0];
const balances = new Map(
  fixture?.plantBalances?.map((balance) => [
    balance.plantCode,
    balance.quantityOnHand,
  ]),
);
if (
  fixturePage?.total !== 1 ||
  fixture?.materialNumber !== 'MAT-000123' ||
  fixture.unitPriceAud !== '19.95' ||
  fixture.totalQuantityOnHand !== '40.000' ||
  balances?.get('4000') !== '12.000' ||
  balances?.get('3000') !== '28.000' ||
  balances?.get('2000') !== '0.000'
) {
  console.error(
    'Unexpected seeded material response:',
    JSON.stringify(fixtureResponse),
  );
  process.exit(1);
}
NODE

echo "Container smoke passed at $url/materials (project $project): plants.list, filtered materials.list, and MAT-000123 fixture."
