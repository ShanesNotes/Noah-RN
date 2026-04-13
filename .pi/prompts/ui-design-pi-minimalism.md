---
description: Design constraints and styleguide for generating UI in the Noah RN dashboard
---

# UI Design Constraints: "Pi.dev Minimalism"

When writing React or CSS code for the Noah RN dashboard (`apps/clinician-dashboard`), you MUST adhere to the following design constraints. The aesthetic is heavily inspired by pi.dev, Linear, and Vercel—where the interface disappears and content takes priority.

## 1. Structure & Layout
- **Generous Whitespace:** Use padding and margin instead of borders and boxes to separate elements. Typical gaps are `16px`, `24px`, `32px`, and `48px`.
- **No wrappers:** Do not wrap panels, lists, or tables in bounding boxes or cards.
- **Flat UI:** Absolutely NO drop shadows (`box-shadow`), NO gradients, and NO borders unless absolutely necessary for separation (and then, only use `colors.borderLight`).

## 2. Typography
- Rely on typography (size, weight, and color) to establish hierarchy.
- **Font Families:**
  - `"Outfit", sans-serif` for standard UI text, labels, and prose.
  - `"JetBrains Mono", monospace` for IDs, values, logs, code, and strict tabular data.
- **Font Weights:** Use `400` for default, `500` for subtle emphasis, `600` for headers/active states.
- **Colors:** Primary text is `colors.textPrimary` (`#fafafa`). Secondary text is `colors.textSecondary` (`#71717a`). Metadata/labels are `colors.textMuted` (`#52525b`).

## 3. Interactive Elements
- **Tabs/Nav:** Use text weight/color changes, or subtle 2px bottom borders. No background pills.
- **Buttons:** Minimalist. Often just text (`background: transparent`) that highlights on hover, or simple outlines.
- **Inputs:** Unstyled variants with just a bottom border, or minimal borders that highlight with `colors.accent` on focus. No thick rings.
- **Active States:** Subtle left border, bottom border, or simply a font-weight increase and opacity change (e.g., `opacity: 1` vs `0.6`).

## 4. Theme Integration (`src/theme.ts`)
Always import and use the predefined theme colors:
```typescript
import { colors } from '../theme';

// bg: '#09090b'          -> App background
// surface: '#18181b'     -> Elevated elements (code blocks, modals)
// border: '#27272a'      -> Default borders
// borderLight: '#3f3f46' -> Subtle dividers
// accent: '#0ea5e9'      -> Primary brand/interactive color
```

## 5. Status Indicators
- **Do not** use solid background color blocks or pills for statuses (unless very low opacity like `0.1`).
- **Do** use text color (e.g., `color: colors.accent` for PASS, `colors.critical` for FAIL).
- **Do** use tiny colored dots (e.g., `width: 6, height: 6, borderRadius: '50%', background: colors.accent`).

When generating components, strip away unnecessary UI chrome. Ask yourself: "Can I remove this border and just use padding?"
