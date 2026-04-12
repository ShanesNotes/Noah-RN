# pi.dev Runtime Lane Checkpoint 1

This is the minimal operator path for the first isolated `pi.dev` lane on `tower`.

The purpose of Checkpoint 1 is only:

- `pi.dev` installed in Docker on `tower`
- agent/model auth configured inside that isolated lane
- a repeatable way to open a shell inside the lane

It does **not** complete the milestone. The full milestone still requires:

- Shift Report end-to-end through the isolated lane
- draft-only Medplum write-back following `docs/foundations/medplum-draft-review-lifecycle.md`
- narrow Medplum policy verification
- dashboard traces/metrics

## What exists now

- Base Medplum stack: `infrastructure/docker-compose.yml`
- pi lane image: `infrastructure/pi/Dockerfile`
- pi lane compose file: `infrastructure/pi/docker-compose.pi.yml`
- env template: `infrastructure/pi/.env.example`
- helper scripts:
  - `scripts/tower-pi-up.sh`
  - `scripts/tower-pi-shell.sh`
  - `scripts/tower-pi-sync-runtime.sh`
  - `scripts/tower-pi-bootstrap-runtime.sh`
  - `scripts/tower-pi-test-shift-report.sh`

## Operator model

Use two shells:

1. local workstation shell
   - used to `ssh tower`, start/stop the remote container, and attach to it
2. in-container shell
   - used to run `pi`, inspect writable pi state, and verify agent auth

Do **not** run `pi` directly on the bare `tower` host if you want to preserve the isolation boundary.

## First-time setup on `tower`

SSH to `tower` and prepare the env file:

```bash
ssh tower
cd /home/ark/noah-rn
cp infrastructure/pi/.env.example infrastructure/pi/.env
```

Then edit `infrastructure/pi/.env` and fill in:

- provider key for `pi` (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `OPENROUTER_API_KEY`)
- `FHIR_CLIENT_ID`
- `FHIR_CLIENT_SECRET`

If the `tower` user is not uid/gid `1000`, adjust:

- `PI_RUNTIME_UID`
- `PI_RUNTIME_GID`

## Bring up the isolated lane

From the local workstation:

```bash
cd /home/ark/noah-rn
./scripts/tower-pi-up.sh
```

That script:

- ensures the base Medplum stack is up on `tower`
- checks that `infrastructure/pi/.env` exists
- builds the pi image
- starts the `noah-pi-runtime` container

## Open a shell inside the isolated lane

From the local workstation:

```bash
cd /home/ark/noah-rn
./scripts/tower-pi-shell.sh
```

That lands you inside the container, not on the bare host.

Equivalent raw command:

```bash
ssh -t tower "docker exec -it noah-pi-runtime bash"
```

## Sync and bootstrap the real Noah RN runtime path

Checkpoint 1 only proves that the isolated lane exists and that `pi` can run there.
To run the current Shift Report runtime path from inside that lane, sync the current
worker/harness files to `tower` and bootstrap the workspace dependencies/build:

```bash
cd /home/ark/noah-rn
./scripts/tower-pi-sync-runtime.sh
./scripts/tower-pi-bootstrap-runtime.sh
```

That does two things:

- syncs the current local worker/harness/clinical-mcp surfaces into the `tower` checkout
- runs `npm install` and `npm run build:clinical-mcp` inside the isolated container

The runtime sync includes only the current path needed for the live Shift Report loop:

- `packages/agent-harness/`
- `packages/workflows/`
- `services/clinical-mcp/`
- `scripts/run-harness.sh`
- `scripts/medplum-shift-report-worker.sh`
- `infrastructure/medplum/test-shift-report-task.sh`
- root workspace manifests needed for install/build

## Run the existing Shift Report loop from the isolated lane

After sync and bootstrap:

```bash
cd /home/ark/noah-rn
./scripts/tower-pi-test-shift-report.sh
```

This does not invent a second runtime path. It runs the current:

- Medplum `Task(requested)`
- Noah RN worker
- `clinical-mcp`
- harness/workflow
- draft `DocumentReference`
- `Task(completed)`

from inside the isolated `pi` container on `tower`.

## What to run inside the container

Inside the container, verify the basics:

```bash
pwd
echo "$HOME"
echo "$PI_CODING_AGENT_DIR"
pi --help
```

The important detail is that `HOME=/pi-home` and `PI_CODING_AGENT_DIR=/pi-home/agent`, so `pi` has a writable state directory inside the isolated runtime lane.

To verify provider auth is visible in-container:

```bash
env | rg 'GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|OPENROUTER_API_KEY|FHIR_'
```

Then run `pi` inside the container instead of on the host:

```bash
pi
```

Or non-interactive:

```bash
pi -p "pwd && list the top-level files in /workspace"
```

## Where state lives

- repo bind mount: `/workspace`
- writable pi home inside the container: `/pi-home`
- backing host path for writable pi state: `local/pi-runtime/home/`

That keeps runtime state out of the bare host home directory and inside the isolated lane.

## Troubleshooting

### `pi` fails with session/config path errors

Check:

```bash
echo "$HOME"
echo "$PI_CODING_AGENT_DIR"
ls -la /pi-home
```

If those are wrong, the container was not started through `infrastructure/pi/docker-compose.pi.yml`.

### container cannot reach Medplum

Check from inside the container:

```bash
curl -sf "$MEDPLUM_DOCKER_BASE_URL/healthcheck"
```

If that fails, ensure:

- base Medplum stack is running
- Docker network name in `MEDPLUM_DOCKER_NETWORK` matches the base stack network

### wrong file ownership in the repo bind mount

Set the correct values in `infrastructure/pi/.env`:

```bash
PI_RUNTIME_UID=<tower uid>
PI_RUNTIME_GID=<tower gid>
```

You can inspect them on `tower` with:

```bash
id -u
id -g
```
