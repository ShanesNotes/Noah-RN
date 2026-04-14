# `.pi/skills/`

pi.dev-discovered skills live here. pi.dev is the active agent harness foundation (Decision 2026-04-10).

Repo note: this directory is stored at `.noah-pi-runtime/skills/` and mounts as `/runtime/.pi/skills/`.

Authoritative clinical workflow contracts still live under:
- `packages/workflows/`

Skills here carry Pi-native metadata (`pi:` frontmatter, `dependencies.yaml`). See `../README.md` for the promoted-skill inventory (shift-report, unit-conversion, neuro/risk/acuity-calculators, drug-reference, protocol-reference, io-tracker, hello-nurse).

Authority rule:
- If clinical content changes, change it in `packages/workflows/` first, then sync here.
- The `pi:` block and `dependencies.yaml` are Pi-native additions that live only here.
