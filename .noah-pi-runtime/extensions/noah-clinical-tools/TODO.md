# `noah-clinical-tools` Extension TODO

This is a planning stub for the future pi-native deterministic-tools extension.

## Source-of-truth today

- `tools/clinical-calculators/`
- `tools/drug-lookup/`
- `tools/unit-conversions/`
- `tools/trace/`
- `tools/safety-hooks/`

## First implementation goals

1. register deterministic calculators and conversions without changing their underlying implementations
2. preserve current shell-tool behavior while adding pi-native registration
3. keep validation and tracing boundaries explicit

## Non-goals

- do not move deterministic logic into this extension
- do not replace working shell tools with new implementations during the first pi-native batch
