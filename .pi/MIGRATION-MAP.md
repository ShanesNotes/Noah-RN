# Noah RN `.pi/` Migration Map

This file explains how the current restructured repo maps into the future pi.dev project surface.

It is intentionally a planning/control artifact, not live runtime wiring.

## Current Source-of-Truth vs Future pi Surface

| Current source | Future pi surface | Status |
|---|---|---|
| `packages/agent-harness/router/clinical-router.md` | `.pi/extensions/noah-router/` + `.pi/AGENTS.md` / `.pi/SYSTEM.md` | planned |
| `packages/workflows/*/SKILL.md` | `.pi/skills/<name>/SKILL.md` | planned |
| `tools/safety-hooks/` | `.pi/extensions/noah-clinical-tools/` hook/tool registration wrapper | planned |
| `services/clinical-mcp/` | `.pi/extensions/medplum-context/` integration surface | planned |
| `clinical-resources/` | referenced by pi skills/extensions | current external dependency |
| `docs/topology/*` | migration/architecture reference only | current |

## Migration Principle

Until pi.dev runtime glue exists:

- `packages/workflows/` remains the authoritative workflow contract surface
- `packages/agent-harness/` remains the authoritative harness/routing surface
- `.pi/` remains scaffold + mapping + placeholders

## First Workflow Priority

The first workflow remains **Shift Report**.

That means the first meaningful pi-native migration path should eventually connect:

1. `.pi/extensions/noah-router/`
2. `.pi/extensions/medplum-context/`
3. `.pi/skills/shift-report/`
4. `services/clinical-mcp/`
5. `clinical-resources/templates/cross-skill-triggers.md`

## Non-goal

Do not duplicate workflow contract content into `.pi/skills/` until there is a clear decision about:

- mirror vs generate vs hand-maintain
- which fields remain canonical in `packages/workflows/`
- how pi runtime discovery will coexist with the current test suite
