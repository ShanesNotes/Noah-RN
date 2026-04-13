---
name: ui-generation
skill_version: "1.0.0"
description: >-
  "build a component", "generate UI", "create a page", "style this",
  "new view", "layout", "dashboard", "panel", "form", "table view",
  or any request to produce React/CSS/HTML following project design language.
scope:
  - ui_generation
  - component_authoring
  - styling
complexity_tier: delegated
delegate:
  agent: gemini-3.1-pro-preview
  cli: google-gemini-cli
  reason: >-
    Constrained visual generation task. Needs code output fidelity
    and strict style adherence, not clinical reasoning. Fast and cheap.
required_context:
  mandatory:
    - target_surface  # which app or package the UI belongs to
  optional:
    - existing_theme  # path to theme file if the surface has one
    - figma_reference # screenshot or description of target design
    - component_inventory # existing components to compose from
knowledge_sources:
  - design-system  # this skill's own design constraints (below)
limitations:
  - ui_only  # no business logic, no clinical logic, no data fetching
contract:
  you_will_get:
    - production-ready React/TypeScript components
    - CSS or inline styles following the design system
    - theme integration when a theme file exists
  you_will_not_get:
    - API wiring or data fetching
    - clinical logic or safety hooks
    - state management beyond local component state
  use_when:
    - building new UI surfaces
    - restyling existing components
    - prototyping layouts
  do_not_use_when:
    - the work is primarily logic, not presentation
    - clinical safety constraints apply to the output
hitl_category: "I"
---

# UI Generation

Generate React/TypeScript UI components following the Noah RN design language.

## Design Language: Pi Minimalism

The interface disappears. Content takes priority.
Inspired by pi.dev, Linear, and Vercel.

### Core Principles

1. **Subtract, don't add.** For every border, shadow, or wrapper — ask if
   padding alone would work. It usually does.
2. **Typography is hierarchy.** Size, weight, and color do the work that
   boxes and dividers do in lesser designs.
3. **Flat is final.** No drop shadows. No gradients. No card chrome.
4. **Whitespace is structure.** Generous gaps (`16px`, `24px`, `32px`, `48px`)
   replace visual containers.

### Typography

| Role | Font | Weight | Color |
|------|------|--------|-------|
| UI text, labels, prose | `"Outfit", sans-serif` | 400 default, 500 emphasis, 600 headers | `#fafafa` primary, `#71717a` secondary |
| IDs, values, code, tabular data | `"JetBrains Mono", monospace` | 400 | `#71717a` or `#fafafa` depending on emphasis |
| Metadata, timestamps | `"JetBrains Mono", monospace` | 400 | `#52525b` muted |

### Color System

When the target surface has a theme file, import and use it. When it doesn't,
use these defaults:

```
bg:          #09090b    — app background
surface:     #18181b    — elevated elements (code blocks, modals, popovers)
border:      #27272a    — default borders (use sparingly)
borderLight: #3f3f46    — subtle dividers (only when whitespace isn't enough)
accent:      #0ea5e9    — primary interactive color
critical:    #ef4444    — errors, destructive actions
warning:     #f59e0b    — caution states
success:     #22c55e    — confirmations
textPrimary: #fafafa
textSecondary: #71717a
textMuted:   #52525b
```

### Interactive Elements

- **Tabs/Nav:** Text weight + color changes, or subtle 2px bottom borders. No pills.
- **Buttons:** Text-only (`background: transparent`) with hover highlight, or
  minimal outlines. Primary actions get `accent` color text or subtle fill.
- **Inputs:** Bottom border or minimal border. `accent` on focus. No thick rings.
- **Active states:** Subtle left/bottom border, or weight/opacity shift (`1.0` vs `0.6`).

### Status Indicators

- **Do:** Text color (`accent` for pass, `critical` for fail) or tiny colored dots
  (`6px` circle).
- **Don't:** Solid background pills, colored badges, or high-contrast blocks.

### Layout Rules

- No card wrappers. Content floats in whitespace.
- No `box-shadow` anywhere.
- No gradients anywhere.
- Borders only when whitespace fails — and then only `borderLight`.
- Responsive by default. No fixed widths unless explicitly required.

## Execution

When generating UI:

1. **Identify the target surface** — which app/package does this belong to?
2. **Check for existing theme** — if one exists, import it. Don't hardcode colors.
3. **Check for existing components** — compose from what exists before creating new.
4. **Generate** — TypeScript + React. Inline styles or CSS modules. No CSS-in-JS
   libraries unless the surface already uses one.
5. **Strip** — Review output and remove any chrome that doesn't earn its pixels.

## Surface-Specific Notes

When generating for known surfaces:

### `apps/clinician-dashboard`
- Theme at `src/theme.ts` — always import `colors` from there.
- Existing component patterns in `src/components/`.

### `apps/nursing-station`
- Medplum-first surface. Respect Medplum's component library where it exists.
- Pi Minimalism applies to custom components layered on top.

### New surfaces
- Start with the default color system above.
- Create a `theme.ts` as the first file so all components reference it.
