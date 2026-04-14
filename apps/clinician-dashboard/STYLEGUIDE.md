# Noah RN Dashboard Styleguide

## Aesthetic: "pi.dev Simplistic Minimalism"

The Noah RN clinician dashboard follows a strict minimalist design philosophy, heavily inspired by pi.dev, Linear, Vercel, and Stripe documentation. The interface should disappear, letting the clinical data become the primary experience.

### Core Principles

1. **Generous Whitespace** 
   - Let content breathe. Use padding and margin instead of borders and boxes to group elements.
   - Example: Padding arrays like `24px` and `32px` are standard for macro-layout.

2. **Typography over Chrome**
   - Size, weight, and spacing create hierarchy—not colored backgrounds or hard borders.
   - Use text opacity (`colors.textPrimary`, `colors.textSecondary`, `colors.textMuted`) to indicate importance.
   - Typefaces:
     - **Outfit (sans-serif)** for primary UI and prose.
     - **JetBrains Mono (monospace)** for data values, technical IDs, terminal outputs, and precise layout alignment.

3. **Flat, Depthless Surfaces**
   - No drop shadows.
   - No gradients.
   - No visual depth tricks.
   - Borders, when absolutely necessary, should be almost invisible (`colors.border`, `colors.borderLight`).

4. **Near-Monochrome Palette**
   - **Backgrounds:** Near-black (`#09090b`), surface (`#18181b`).
   - **Interactive Accent:** A single muted teal/blue (`#0ea5e9`) used *sparingly* for active states, primary actions, or passed tests.
   - **Data Colors:** Clinical vital signs use specific colors (HR red, BP orange, RR green, SpO2 blue, Temp purple), but they are *muted* to reduce eye strain in a dark environment.

5. **Invisible UI**
   - Controls feel like part of the content.
   - Tabs are just text weight/color changes, not pill backgrounds.
   - Inputs are minimal (often just a subtle bottom border).
   - "Selected" states use a simple left-border or text-weight increase.

### Theme Implementation (`src/theme.ts`)

```typescript
export const colors = {
  bg: '#09090b',
  surface: '#18181b',
  surfaceHover: '#27272a',
  border: '#27272a',
  borderLight: '#3f3f46',
  textPrimary: '#fafafa',
  textSecondary: '#71717a',
  textMuted: '#52525b',
  accent: '#0ea5e9', // Primary interactive / success color

  // Muted clinical colors
  hr: '#e11d48',
  bp: '#ea580c',
  rr: '#16a34a',
  spo2: '#0284c7',
  temp: '#9333ea',

  // Status mapping
  critical: '#e11d48',
  warning: '#ea580c',
  normal: '#16a34a',
  info: '#0284c7',
};
```

### Component Patterns

#### Tabs & Navigation
- **Avoid:** Boxes, background fills, pills.
- **Use:** Text color transitions, font-weight changes, or subtle 2px bottom borders.

#### Data Tables & Lists
- **Avoid:** Bounding boxes around the table, zebra striping with heavy backgrounds.
- **Use:** 1px border-bottom lines (`colors.borderLight`), generous padding, alignment.

#### Status Indicators
- **Avoid:** Huge colored badges with backgrounds.
- **Use:** Colored text or tiny colored dots (6x6px `borderRadius: '50%'`) next to the text.

#### Pre/Code Blocks
- **Avoid:** Hard borders.
- **Use:** `colors.surface` background, zero border, proper monospace padding.

### Prompt Reference for LLM/Agents
If you need an LLM or Agent to generate new UI for this project, append or point them to `.noah-pi-runtime/prompts/ui-design-pi-minimalism.md` to ensure they adhere to these design constraints.
