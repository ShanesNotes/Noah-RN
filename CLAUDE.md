@AGENTS.md

TypeScript npm-workspaces monorepo (`apps/*`, `services/*`, `packages/*`)
plus a large bash test suite under `tests/`. Node 20.

- Install: `npm ci` at the root, and again in `apps/clinician-dashboard`
  (it carries its own package-lock.json).
- Test (all JS workspaces): `npm test`
- Typecheck: `npx tsc --noEmit` inside the workspace you changed
- Lint: `npm run lint --workspace apps/clinician-dashboard` (only the two
  apps define a lint script)
- Shell suites, which CI also runs: `bash tests/clinical/run-tests.sh` and the
  other `tests/*/test_*.sh` scripts listed in `.github/workflows/ci.yml`
- Tracker: none in-repo. Control plane is `README.md` → `PLAN.md` → `TASKS.md`.
