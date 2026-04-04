# Paperclip Refactor Change List

## Surviving agent mapping

| Current ID | Current name/title | Target role after refactor | Runtime target |
|---|---|---|---|
| `8a9b7a27-d10b-4487-8754-c456c02e1d1d` | Jimmy / CEO | CEO / Product Owner | `claude_local --bare` |
| `228a37ec-848a-4b94-9f2e-ab9d0ec166c4` | Wiz / Founding Engineer | Founding Engineer | `claude_local` + OMC |
| `0bf0a4ce-3496-4590-9f78-0303b17890ef` | Sol / CTO | Principal Architect | `codex_local` + OMX |

## Retired agent state
Target retired IDs:

- `15c40fce-4890-4ec5-9acc-480c71f80ff9`
- `1c976410-9062-4298-a288-3ef23a6884c0`
- `7fb2b9aa-9c0a-429f-84ec-313d14c493a6`
- `8b05bd19-2238-4a69-bd0a-93988e069cad`
- `9e12949c-d834-4221-9841-e7e363ad77b4`
- `b107ef64-729a-440d-a783-cb90301c6dac`
- `f0f6aa25-8fb9-4fe2-a4c9-2dcc6632fc62`

What was done in this refactor:
- The orphaned filesystem-only QA stub (`b107...`) was deleted locally.
- The 6 live retired agents were tombstoned in place: title prefixed with `RETIRED —`, capabilities rewritten, `reportsTo` cleared, `runtimeConfig.heartbeat.enabled=false`, and assignment permissions removed.
- Retired agents had their `desiredSkills` stripped. Claude-based retired agents now use an invalid `retired-disabled` model; OpenCode-based retired agents point at inert retired workspaces.
- Their instruction bundles were reduced to a retirement notice so they cannot be mistaken for active lanes.
- Open issues that still belonged to retired agents were reassigned to the CEO / Product Owner for triage under the 3-agent model.

Why they were not fully deleted:
- Paperclip's `DELETE /api/agents/:id` currently fails with a foreign-key violation from `activity_log -> heartbeat_runs`, so full deletion would require destructive audit-log cleanup.
- To preserve Paperclip auditability, the safe fallback was tombstoning plus technical disablement rather than hard deletion.

## Desired skill targets

### CEO / Product Owner
Keep:
- `paperclipai/paperclip/paperclip`
- `paperclipai/paperclip/paperclip-create-agent`
- `paperclipai/paperclip/para-memory-files` *(optional; keep only if Paperclip memory compatibility is still needed)*

Remove:
- `paperclip-create-plugin`
- all `obra/superpowers/*`
- all `garrytan/gstack/*`
- all `vercel-labs/*`
- hookify-specific extras

### Founding Engineer
Keep:
- `paperclipai/paperclip/paperclip`
- `paperclipai/paperclip/para-memory-files` *(optional; only if needed alongside OMC state)*

Remove:
- `paperclip-create-agent`
- `paperclip-create-plugin`
- all `obra/superpowers/*`
- all `garrytan/gstack/*`
- all `vercel-labs/*`
- frontend/plugin extras that OMC already covers for execution

### Principal Architect
Keep:
- `paperclipai/paperclip/paperclip`
- `paperclipai/paperclip/para-memory-files` *(optional; only if Codex-side Paperclip memory access is truly needed)*

Remove:
- every Paperclip-era execution skill
- every `obra/superpowers/*`
- every `garrytan/gstack/*`
- every `vercel-labs/*`

## Workspace skill sync cleanup
The repo-local `.agents/skills/` directory should only keep:
- `paperclip`
- `paperclip-create-agent`
- `para-memory-files`

Noah RN clinical domain skills stay in `plugin/skills/`.

## Paperclip UI setup checklist

### 1. CEO / Product Owner (`8a9b7a27...`)
- Rename to **CEO / Product Owner**
- Keep model/provider on Claude Opus
- Adapter type: `claude_local`
- If your adapter supports extra args, add `--bare` so the CEO avoids OMC plugin overhead while staying on raw Claude Code
- Replace desiredSkills with the CEO target list above
- Confirm AGENTS/SOUL files point to the rewritten bundle

### 2. Founding Engineer (`228a37ec...`)
- Keep or rename to **Founding Engineer**
- Model/provider: Claude Opus
- Adapter type: `claude_local`
- Do **not** use `--bare`; this lane should inherit OMC
- Replace desiredSkills with the Founding Engineer target list above
- Confirm `cwd` is `/home/ark/noah-rn`

### 3. Principal Architect (`0bf0a4ce...`)
- Rename from **Sol / CTO** to **Principal Architect**
- Change adapter type from `opencode_local` to `codex_local`
- Set model/provider to GPT-5.4 / Codex
- Ensure global `omx` is on PATH
- If the adapter supports `extraArgs`, prefer `--madmax --high`; otherwise rely on the rewritten AGENTS runtime contract to invoke `omx --madmax --high`
- Replace desiredSkills with the Principal Architect target list above
- Confirm `cwd` is `/home/ark/noah-rn`

### 4. Remove retired agents from the Paperclip UI
- The orphaned QA stub is already deleted locally
- The 6 retired live agents are already tombstoned, heartbeat-disabled, stripped of assignment permission, and pointed away from the active repo/runtime surface
- If/when Paperclip fixes `DELETE /api/agents/:id`, remove those tombstoned agents from the UI/API for a true 3-agent roster
- Until then, verify the **active** reporting lines collapse to a single CEO with two engineer direct reports

## Notes
- OMC availability was verified via `~/.claude/settings.json`
- OMX availability was verified via global `oh-my-codex` installation
- Repo-local `.agents/skills/` has already been pruned to `paperclip`, `paperclip-create-agent`, and `para-memory-files`
- Live Paperclip metadata for the 3 surviving agents has already been patched through the local API
- Full hard deletion of the 6 retired live agents is currently blocked by a Paperclip server foreign-key bug; see the retired-agent note above
- Until that bug is fixed, the retired agents are intentionally left technically inert rather than merely documented as retired

## Surviving instruction bundle contract
The active bundles are intentionally reduced to **`SOUL.md` + `AGENTS.md` only**.
Old `HEARTBEAT.md` / `TOOLS.md` sidecars were removed from the CEO bundle and are not part of the surviving contract.

## Live Paperclip metadata changes applied
These live metadata updates were applied through the local Paperclip API:
- Jimmy title -> `CEO / Product Owner`, desiredSkills narrowed, adapter `extraArgs` includes `--bare`
- Wiz now reports directly to Jimmy and desiredSkills narrowed to `paperclip`
- Sol retitled to `Principal Architect`, role set to `engineer`, now reports to Jimmy, and adapter changed to `codex_local` with `gpt-5.4` + high reasoning + bypass approvals
