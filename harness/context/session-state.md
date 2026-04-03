# Session State Contract

Defines how workspace state persists within a conversation session.

## Scope

- **Within session**: Patient context, capability invocation history, and
  active issues accumulate across turns.
- **Across sessions**: Nothing persists. Each new conversation starts fresh.
  This is by design — no storage means no PHI risk.

## State Components

### Patient Context
See `patient-context.md`. Built incrementally from nurse input.

### Capability History
Track which capabilities have been invoked this session to avoid redundant
work and enable composition:

```yaml
session:
  capabilities_invoked: []    # e.g., ["shift-report", "drug-reference:metoprolol"]
  tools_called: []            # e.g., ["gcs.sh E3V4M5", "lookup.sh norepinephrine"]
  knowledge_read: []          # e.g., ["protocols/sepsis-bundle.md"]
  active_issues: []           # flagged [!] items from prior outputs
```

### Workspace Problem Stack
The workspace agent tracks what problems have been identified and their
resolution status:

```yaml
problems:
  - id: "sepsis-compliance"
    status: resolved          # resolved | open | deferred
    resolved_by: ["protocol-reference", "drug-reference"]
  - id: "line-assessment"
    status: open
    context: "questionable 20g in right AC"
```

## Rules

1. State is conversational memory, not a database.
2. State is never written to disk.
3. State is never transmitted outside the conversation.
4. If the conversation is lost, state is lost. This is acceptable.
5. The nurse can always provide context again — it's faster than
   managing state persistence and infinitely safer than storing PHI.
