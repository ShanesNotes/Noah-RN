# Noah RN Workspace Orchestration Decision

This document defines the required workspace-orchestration approach before runnable surfaces move into `apps/` and `services/`.

## Decision

Adopt **root-level npm workspaces** as the orchestration layer for the restructured repo.

Initial target:

- package manager: **npm**
- root manifest: **`package.json`**
- workspace globs:
  - `apps/*`
  - `services/*`
  - `packages/*`

Do **not** introduce Turborepo, pnpm, Nx, or another orchestration layer in the first runnable migration batch.

## Why This Approach Wins

### Evidence from the current repo

- Root `package.json` now defines npm workspaces for `apps/*`, `services/*`, and `packages/*`.
- `apps/clinician-dashboard/package.json` uses npm-compatible scripts with `vite`, `vitest`, and `tsc -b`.
- `services/clinical-mcp/package.json` uses npm-compatible scripts with `tsx`, `vitest`, and `tsc`.
- Both runnable surfaces are JavaScript/TypeScript packages and can be coordinated with standard npm workspaces.

### Decision rationale

1. **Lowest migration complexity**
   - adds one orchestration layer instead of both a topology migration and a new build platform.
2. **Good AI-agent discoverability**
   - a root `package.json` with `workspaces` is a familiar default for coding agents.
3. **Compatible with current scripts**
   - existing package-local `dev`, `build`, `test`, and `test:watch` scripts can stay recognizable.
4. **Keeps future options open**
   - Turborepo or another task runner can be added later if cross-package scale justifies it.

## Rejected Alternatives

### 1. No workspace orchestration

Keep each moved package fully isolated and rely on manual `cd` + command execution.

Rejected because:
- it makes the new topology harder for agents to operate,
- it weakens root-level verification and onboarding,
- it leaves the restructure half-finished operationally.

### 2. Turborepo now

Rejected because:
- there is no root package/workspace baseline yet,
- it adds an extra tool and config surface during the same batch as the first runnable moves,
- the repo only has two obvious runnable packages today.

### 3. pnpm workspaces now

Rejected because:
- current surfaces are already npm-shaped,
- switching package managers during the same migration batch increases risk without clear payoff.

## Initial Root Manifest Contract

When runnable moves begin, create a root `package.json` with these properties:

```json
{
  "name": "noah-rn",
  "private": true,
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*"
  ]
}
```

Initial root scripts should be simple and explicit:

- `build:dashboard`
- `test:dashboard`
- `build:clinical-mcp`
- `test:clinical-mcp`
- optional aggregate scripts once both moved packages are stable:
  - `build`
  - `test`

Current state:
- the root `package.json` now defines `build:dashboard`, `test:dashboard`, `build:clinical-mcp`, `test:clinical-mcp`, plus aggregate `build` and `test`
- all of these scripts delegate directly to npm workspace targeting rather than custom wrappers

## Script Naming Policy

Inside each workspace package, preserve familiar local scripts where possible:

- `dev`
- `build`
- `test`
- `test:watch`

This keeps the move structural rather than behavioral.

## Guardrails

1. Do not change package manager during the first runnable move batch.
2. Do not add a task orchestrator before the root npm workspace baseline exists.
3. Keep package-local scripts working before introducing aggregate root scripts.
4. Verify moved packages by both:
   - running inside the package directory, and
   - running via npm workspace targeting from root.

## Execution Consequences

Current state:
- `apps/clinician-dashboard/` is the current dashboard execution location.
- `services/clinical-mcp/` is the current service execution location.

Next runnable batch:
- keep the root `package.json`
- update docs and verification commands to use workspace-aware paths for both surfaces

After that batch:
- root-level verification may use workspace-targeted npm commands
- package-local scripts remain the source of truth for runtime behavior

## Verification Commands

Current-state baseline:

```bash
ls package.json pnpm-workspace.yaml turbo.json 2>/dev/null || true
cat apps/clinician-dashboard/package.json
cat services/clinical-mcp/package.json
```

Post-move target verification:

```bash
npm run test --workspace apps/clinician-dashboard
npm run build --workspace apps/clinician-dashboard
npm run test --workspace services/clinical-mcp
npm run build --workspace services/clinical-mcp
```

## Status

This decision satisfies the “choose workspace orchestration before runnable moves” gate in the topology migration plan, and both first runnable surfaces now live under the workspace layout.
