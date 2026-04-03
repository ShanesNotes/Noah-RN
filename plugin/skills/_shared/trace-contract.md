# Trace Contract — Shared Across All Skills

Every skill invocation MUST be traced. This contract defines the trace lifecycle.
Skills reference this file instead of duplicating trace boilerplate.

## Trace Lifecycle

### 1. Init (before any other work)

```bash
CASE_ID=$(bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" init "<skill-name>")
```

### 2. Record Input (after collecting input, before processing)

```bash
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" input "$CASE_ID" '{"query":"<user query>","patient_context":<any patient context as JSON or null>}'
```

### 3. Record Output (after generating response)

```bash
echo "<complete output>" | bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" output "$CASE_ID"
```

### 4. Record Hooks (after hooks fire, or empty)

```bash
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" hooks "$CASE_ID" '{"hooks_fired":[]}'
```

### 5. Finalize (close trace)

```bash
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" done "$CASE_ID"
```

## Rules

- Trace logging is append-only.
- Traces must not block or alter skill output.
- If trace commands fail, continue with normal skill execution.
- Trace output is stored in `optimization/product/traces/`.
