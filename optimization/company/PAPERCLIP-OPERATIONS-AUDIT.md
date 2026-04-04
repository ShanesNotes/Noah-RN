# Paperclip Operations Audit

This note captures the Paperclip-native behaviors that must remain intact even after the Noah RN company was simplified to the 3-agent OMC/OMX model.

## What was pared down too aggressively
The first refactor pass preserved governance and runtime split, but it trimmed away some Paperclip-native operating behavior that made the system fun and visible:
- task-thread communication as the canonical surface
- checkout / heartbeat discipline
- explicit blocker and handoff comments
- plan-document usage
- Paperclip reassignment visibility

## Non-negotiable Paperclip-native behaviors to preserve
1. **Paperclip is the control plane**
   - important decisions, progress, blockers, and handoffs must be written back to the issue thread
2. **Always checkout before work**
   - do not substitute status mutation for checkout
3. **Never retry a 409**
   - another agent owns the task
4. **`in_progress` work needs comments**
   - agents should not disappear into runtime-only transcripts
5. **Blocked work must be explicitly marked `blocked`**
   - with a clear unblocker named
6. **Plan requests belong in the `plan` issue document**
   - with a thread comment pointing to the update
7. **Mention-based handoffs are special**
   - do not self-assign casually outside the Paperclip flow
8. **Board handoff requests should route back through Paperclip**
   - not just through chat/session replies

## Practical future checks
If communication feels broken again, check these first:
- did the agent comment back into the issue thread?
- did the agent update status/blocker state before exit?
- did the agent use checkout?
- did the agent leave the result only in Claude/Codex runtime output?
- did a new instruction rewrite accidentally remove the Paperclip operating contract section?

## Recommended steady-state pattern
- **Paperclip**: task thread, comments, status, assignment, plan docs, approvals
- **OMC / OMX**: execution substrate
- **Agent instructions**: must explicitly bridge runtime output back into Paperclip
