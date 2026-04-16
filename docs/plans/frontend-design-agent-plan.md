# Front-End Design Agent — Full UI Polish Plan

> Scope: Every user-facing element across `apps/nursing-station` and `apps/clinician-dashboard`.
> Stack: Mantine 8.x, Recharts, Tabler Icons, Medplum React, PostCSS.

---

## Phase 0: Foundation (do first — everything else builds on this)

### 0A. Design Token Consolidation
- **File**: `apps/nursing-station/src/theme.ts` (and dashboard duplicate)
- Extract `colors`, spacing scale, radius scale, shadow scale, and typography into a shared `packages/ui-tokens/` package
- Both apps import from one source of truth — kill the duplicate `theme.ts` files
- Add CSS custom properties export so tokens work in `index.css` overrides too (replace ~40 hardcoded hex values in `index.css`)

### 0B. Shared Component Library Scaffold
- Create `packages/ui/` with barrel exports
- Move reusable primitives here as they get polished (Field, StatusBadge, SectionHeader, ClinicalCard)
- Mantine theme provider wrapper with noah-rn defaults

### 0C. Inline Style Extraction
- Every component currently uses raw `style={{}}` objects — migrate to Mantine's `styles` API or CSS modules
- Priority: makes responsive breakpoints and hover states possible (inline styles can't do media queries or `:hover` properly)

---

## Phase 1: Nursing Station — Layout & Navigation

### 1A. App Shell & Sidebar (`App.tsx`)
- Current: bare `<button>` nav items with inline styles, no icons, no hover feedback
- Polish: icon per nav item (Tabler), hover highlight with `surfaceHover` token, active indicator animation, collapse-to-icon on mobile, user/session info at bottom
- Add subtle border glow or gradient accent to active item

### 1B. Patient List / Worklist (`PatientListPage.tsx`)
- Search/filter bar with proper input styling
- Patient cards: add subtle hover elevation, avatar/initials circle, acuity indicator, consistent spacing
- Empty state illustration
- Loading skeleton placeholders (Mantine `Skeleton`)

### 1C. Patient Header (`PatientHeader.tsx`)
- Current: functional grid layout, no visual hierarchy beyond font size
- Polish: colored acuity/code-status badge, allergy badges with severity color coding, sticky header with backdrop blur, subtle divider between identity and clinical fields
- Back button: proper icon button with hover ring

### 1D. Chart Shell & Section Nav (`PatientChartPage.tsx`, `ChartSectionNav.tsx`)
- Tab/section transitions (fade or slide)
- Active section indicator in sidebar
- Breadcrumb or context line showing Patient > Section
- Scroll-spy to highlight current section in nav

---

## Phase 2: Nursing Station — Clinical Panels

### 2A. Vitals Panel (`VitalsPanel.tsx`)
- Trend badges: add directional arrow icons, pulse animation on critical values
- Sparkline mini-charts inline with each vital (Recharts `Sparkline` or `Area` at 60x20px)
- Color-coded backgrounds for out-of-range values (subtle, not alarming — use 8% opacity fills)
- Timestamp relative formatting ("12m ago" vs full datetime)

### 2B. Lab Results Panel (`LabResultsPanel.tsx`)
- Table layout with alternating row shading
- Abnormal flags: bold + color pill, not just text
- Expandable row for reference range context
- Delta indicator (arrow up/down from previous value)

### 2C. Overview Panel (`OverviewPanel.tsx`)
- Card-based layout with consistent padding and border radius
- Section headers with icon + count badges
- Quick-action buttons (acknowledge, escalate) with proper button styling
- "At a glance" vitals strip across the top

### 2D. Medication List (`MedicationList.tsx`)
- Status pills: green/amber/gray with proper contrast ratios
- Route + timing as secondary text row
- Group by status with collapsible sections
- PRN medications visually distinct

### 2E. Task Worklist (`TaskWorklist.tsx`, `TaskListPage.tsx`, `TaskReviewPanel.tsx`)
- Drag reorder (Mantine `@mantine/hooks` or `dnd-kit`)
- Priority color stripe on left edge
- Due time countdown badge
- Action buttons: primary CTA styling, destructive actions in red
- Completed tasks: strikethrough + muted palette

---

## Phase 3: Clinician Dashboard

### 3A. Tab Layout (`App.tsx`)
- Current: basic Mantine tabs
- Polish: tab underline animation, tab badge counts, keyboard nav
- Consistent panel padding and max-width

### 3B. Eval Dashboard (`EvalDashboard.tsx`)
- Chart theming: match noah-rn color tokens, dark grid lines, tooltip styling
- Score cards with trend indicators
- Pass/fail color coding consistent with clinical palette

### 3C. Trace Viewer (`TraceViewer.tsx`)
- Syntax highlighting for JSON payloads
- Collapsible trace spans with timing bars
- Status color coding on span headers

### 3D. Context Inspector (`ContextInspector.tsx`)
- Tree view with expand/collapse
- Search/filter within context
- Copy-to-clipboard on values

### 3E. Terminal Panel (`TerminalPanel.tsx`)
- Proper terminal font rendering (JetBrains Mono already available)
- ANSI color support
- Scrollback with virtual scrolling for performance

---

## Phase 4: Cross-Cutting Concerns

### 4A. Accessibility (A11y)
- Current state: 1 `aria-label` in entire codebase
- Add `aria-label` to all interactive elements (buttons, links, inputs)
- `role` attributes on custom widgets (tabs, grids, alerts)
- Focus ring styling (visible, matches accent color)
- Screen reader announcements for dynamic content (toast notifications, loading states)
- Color contrast audit — ensure all text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- Keyboard navigation: all interactive elements reachable via Tab, Escape closes modals

### 4B. Responsive Design
- Current: `navbar breakpoint: 'sm'` only
- Mobile breakpoints: sidebar collapses to bottom tab bar below `sm`
- Patient header: stack fields vertically on narrow screens
- Charts: responsive container with min-height
- Touch targets: minimum 44x44px on mobile

### 4C. Motion & Transitions
- Page transitions: subtle fade (150ms)
- Panel expand/collapse: height animation
- Loading states: skeleton shimmer (Mantine `Skeleton`)
- Toast/notification entrance: slide-in from top-right
- Hover micro-interactions on cards and buttons (scale 1.01, shadow lift)
- Respect `prefers-reduced-motion`

### 4D. Error & Empty States
- Every list/panel needs: loading skeleton, empty state with illustration + CTA, error state with retry
- Consistent error boundary styling (currently bare `ErrorBoundary.tsx`)
- Offline indicator banner

### 4E. Medplum Component Overrides (`index.css`)
- Current: ~100 lines of `!important` overrides
- Migrate to Mantine theme `components` config where possible
- Remaining overrides: use specificity instead of `!important`
- Style `SearchControl`, `PatientTimeline`, signin form to feel native

---

## Phase 5: Polish & Delight

### 5A. Loading Experience
- App-level loading screen with logo animation
- Route-level loading with progress bar (top of viewport, like YouTube)
- Optimistic UI for task status changes

### 5B. Sign-In Page (`SignInPage.tsx`)
- Full-bleed dark layout with centered card
- Logo + tagline
- Health check status as subtle pill, not prominent UI
- Smooth transition to authenticated state

### 5C. Typography Audit
- Ensure heading hierarchy is consistent (h1 on pages, h2 on panels, h3 on sections)
- Line height and letter spacing standardized via tokens
- Monospace used intentionally (data, labels, IDs) not decoratively

### 5D. Icon Consistency
- Audit all Tabler icon usage for size/stroke consistency
- Add icons to nav items, section headers, empty states
- Clinical-specific iconography for vitals (heart, lungs, thermometer, blood pressure)

---

## Execution Notes

**Order matters**: Phase 0 must land first — without shared tokens and extracted styles, every subsequent change creates drift. Phases 1-3 can parallelize by app. Phase 4 weaves through everything.

**Testing**: After each component polish, verify:
1. `npm run dev` — visual check in browser
2. Fixture mode (`?fixture=shell`) still renders correctly
3. No Mantine console warnings
4. Keyboard-navigate the changed component

**Don't break**:
- `data-testid` attributes (used by integration tests)
- Medplum hook data flow (don't restructure component hierarchy without preserving hook call sites)
- Fixture/shell mode bypass paths
- Route structure (`/`, `/Patient/:id/:section?`, `/Task`)

**Files to never auto-modify without reading first**:
- `apps/nursing-station/src/fixtures/` — test fixture data
- `services/clinical-mcp/` — backend, not UI
- `.noah-pi-runtime/` — agent runtime, not UI
