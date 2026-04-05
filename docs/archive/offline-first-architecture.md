# Offline-First Architecture Research Report — Noah RN Clinical Dashboard

**Date:** 2026-04-01
**Status:** Research

---

## 1. Current Dashboard Offline Gap Analysis

### 1.1 Architecture Summary

The dashboard is a thin React SPA with a single data access pattern:

```
MedplumClient (HTTP) → HAPI FHIR R4 → Render
```

- **Single entry point:** `medplum.ts` creates a bare `MedplumClient` pointed at `http://10.0.0.184:8080/` with zero offline configuration.
- **Data hook:** `useFhirSearch` — wraps `medplum.searchResources()` in a `useState`/`useEffect` pattern. No caching, no retry, no fallback.
- **No service worker:** The Vite build produces static assets only. No `vite-plugin-pwa`, no `workbox`, no `manifest.json`.
- **No local storage:** `MedplumClient` has a `ClientStorage` layer (backed by `localStorage`) but it's only used for auth tokens/session state, not FHIR resource caching. The `getCached()` method exists in the SDK but is never called.
- **No PWA manifest:** Not installable.

### 1.2 What Breaks When Network Drops

| Component | FHIR Queries | Offline Behavior |
|---|---|---|
| `PatientList` | `Patient?_count=100` | Blank sidebar, error displayed |
| `AssignmentView` | `Observation` (vitals), `MedicationRequest` | Loading spinner forever, then error |
| `VitalsPanel` | `Observation?patient=X&code=...` | Loading spinner forever, then error |
| `LabsPanel` | `Observation?patient=X&category=laboratory` | Loading spinner forever, then error |
| `MedsPanel` | `MedicationRequest`, `MedicationAdministration` | Loading spinner forever, then error |
| `SBARReport` | 5 concurrent queries (Observation, Condition, MedicationRequest, AllergyIntolerance, Observation) | Loading spinner forever, then error |

**Total resource types queried:** `Patient`, `Observation`, `MedicationRequest`, `MedicationAdministration`, `Condition`, `AllergyIntolerance` (6 types).

**Failure mode:** Complete white-screen-of-death for any panel that hasn't loaded. No stale data fallback. No offline indicator. No retry logic.

### 1.3 Medplum SDK Offline Capabilities (What Exists)

The `@medplum/core` SDK (v4.5.2) provides primitives that are **not used**:

- **`ClientStorage`** — localStorage-backed key/value store. Used internally for auth tokens. Could be extended for resource caching.
- **`MedplumClient.getCached(resourceType, id)`** — Returns a resource from the in-memory cache if previously fetched. Only works for reads by ID, not search results.
- **`MedplumClientOptions.storage`** — Allows swapping the storage backend (e.g., to IndexedDB).

**Verdict:** The SDK has no built-in offline-first search caching. It's designed for connected use. The `getCached()` method only helps for individual resource reads, not the search-heavy pattern this dashboard uses.

---

## 2. Recommended Offline Architecture

### 2.1 Three-Layer Storage Model

Adapted from proven health PWA patterns (DHIS2, CrisisCore Systems, WellAlly):

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Service Worker Cache (Workbox)            │
│  Purpose: Shell + static assets + FHIR API responses│
│  Strategy: Network-first with stale-while-revalidate│
│  Storage: Cache API (browser-managed)               │
├─────────────────────────────────────────────────────┤
│  Layer 2: IndexedDB FHIR Resource Store (Dexie.js)  │
│  Purpose: Durable FHIR resource cache, query offline│
│  Strategy: Write-through on every successful fetch   │
│  Storage: IndexedDB via Dexie.js                    │
├─────────────────────────────────────────────────────┤
│  Layer 3: In-Memory React State                     │
│  Purpose: UI rendering, derived state               │
│  Strategy: Hydrate from IndexedDB on mount          │
│  Storage: useState/useMemo (current pattern)        │
└─────────────────────────────────────────────────────┘
```

### 2.2 Layer 1: Service Worker (Workbox via vite-plugin-pwa)

**Role:** Intercept FHIR API requests, serve cached responses when offline, manage app shell caching.

**Recommended caching strategies per route type:**

| Route | Strategy | Rationale |
|---|---|---|
| App shell (`/`, `index.html`, JS/CSS chunks) | **Precache** (revisioned) | Must always load, even first-time offline |
| FHIR search (`/fhir/Patient?...`, `/fhir/Observation?...`) | **Network-first, fallback to cache** | Freshness matters, but stale > nothing |
| FHIR read by ID (`/fhir/Patient/123`) | **Stale-while-revalidate** | Resources change infrequently |
| FHIR metadata / CapabilityStatement | **Cache-first, 24h TTL** | Rarely changes |

**Why Workbox over hand-rolled SW:** DHIS2's deep-dive confirms Workbox handles precache manifests, revision hashes, and lifecycle management correctly. Hand-rolling SW lifecycle is the #1 cause of "stuck on old version" bugs.

### 2.3 Layer 2: IndexedDB FHIR Resource Store (Dexie.js)

**Role:** Durable, queryable local store of FHIR resources. Survives browser restart. Works when SW cache is cleared.

**Schema design:**

```typescript
// dexie schema
interface FhirResourceRecord {
  id: string;           // FHIR resource ID
  resourceType: string; // Patient, Observation, etc.
  resource: object;     // Full FHIR JSON
  searchQuery?: string; // The query that produced this (for search result sets)
  fetchedAt: number;    // Epoch ms — critical for staleness
  etag?: string;        // For conflict detection on updates
  patientId?: string;   // Denormalized for patient-scoped queries
}

// Stores:
// - resources: [id] (primary key)
// - searchResults: [searchQuery] (maps queries to resource ID arrays)
```

**Why Dexie.js over raw IndexedDB:**
- TypeScript-first, minimal boilerplate
- Used by WellAlly and other health PWAs in production
- Handles version migrations cleanly
- ~7KB gzipped

**Write-through pattern:**

```
fetch from FHIR server → write to IndexedDB → update React state
                                                    ↓ (offline)
                                          read from IndexedDB → React state
```

### 2.4 Layer 3: Enhanced Data Hook

Replace `useFhirSearch` with an offline-aware version:

```typescript
// New hook signature (backward compatible)
function useFhirSearch<T>(resourceType, query, enabled?) {
  // 1. On mount: load from IndexedDB immediately (stale data)
  // 2. Start network fetch in background
  // 3. On success: update IndexedDB + state
  // 4. On failure (offline): keep IndexedDB data, set stale flag
  return { data, loading, error, isStale, lastSyncedAt, refetch };
}
```

Key additions over current hook:
- **`isStale`** — boolean: data is from cache and hasn't been refreshed
- **`lastSyncedAt`** — timestamp of last successful fetch
- **Immediate render from cache** — no loading spinner on repeat visits

---

## 3. PWA Feasibility (Installable Bedside App)

### 3.1 Assessment: High Feasibility

The dashboard is an ideal PWA candidate:
- **Already a SPA** — no SSR complications
- **Vite build** — `vite-plugin-pwa` is the standard integration
- **Dark theme already** — matches bedside monitor aesthetics
- **No complex navigation** — flat patient → panel structure

### 3.2 Implementation Requirements

```typescript
// vite.config.ts additions
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Noah RN — Clinical Dashboard',
        short_name: 'Noah RN',
        description: 'Clinical decision support for critical care nurses',
        theme_color: '#0B0E14',
        background_color: '#0B0E14',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          // FHIR API routes
          {
            urlPattern: /\/fhir\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fhir-api',
              expiration: { maxEntries: 500, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
});
```

### 3.3 Bedside-Specific Considerations

- **`display: 'standalone'`** — removes browser chrome, looks like native app
- **`orientation: 'landscape'`** — bedside monitors are landscape
- **Wake Lock API** — prevent screen dimming during critical care monitoring (optional, browser support: Chrome/Edge 84+)
- **Periodic Background Sync** — refresh data when browser is in background (limited support: Android Chrome only)

### 3.4 Limitations

- **iOS Safari PWA limitations:** No background sync, no periodic sync, IndexedDB quota ~1GB. Still functional but sync is manual (pull-to-refresh pattern).
- **No push notifications** without a service worker backend pairing (out of scope for v1).

---

## 4. Data Sync Strategy

### 4.1 What to Cache (Priority Order)

| Priority | Resource Type | Cache TTL | Rationale |
|---|---|---|---|
| P0 | `Patient` (list + details) | 24h | Demographics rarely change |
| P0 | `Observation` (vitals: 8867-4, 55284-4, 9279-1, 2708-6, 8310-5) | 15min | Critical — but stale vitals are dangerous |
| P1 | `MedicationRequest` (active) | 30min | Active orders change infrequently |
| P1 | `AllergyIntolerance` | 24h | Rarely changes, high clinical importance |
| P2 | `Condition` | 1h | Diagnoses change slowly |
| P2 | `MedicationAdministration` | 30min | Admin records are append-only |
| P3 | `Observation` (labs) | 1h | Lab results change slowly |

### 4.2 Sync Triggers

| Trigger | Action |
|---|---|
| App mount | Load all cached data immediately, start background refresh |
| Network restore (online event) | Refresh all P0 + P1 data for visible patient |
| Tab visibility change (visible) | Refresh if last sync > TTL |
| Manual pull-to-refresh / refetch button | Force refresh all visible data |
| Patient switch | Load cached data for new patient immediately, start background fetch |
| Background (every 5min, if Periodic Sync available) | Refresh P0 data for current patient |

### 4.3 Conflict Resolution

**Current dashboard is read-only** — no writes to FHIR server. This simplifies conflict resolution dramatically:

- **No write conflicts possible** — the dashboard doesn't create/update/delete resources
- **Stale data is the only risk** — mitigated by TTL + staleness indicators
- **SBARReport notes field** — currently local-only (`useState`), not persisted to FHIR. If this becomes a write target, it needs a local-outbox pattern (queue writes in IndexedDB, sync when online).

**Future write path (if needed):**

```
User writes → save to IndexedDB outbox → mark as pending
    → Background Sync posts to FHIR server
    → On success: remove from outbox, update local copy
    → On conflict (ETag mismatch): show conflict UI to nurse
```

For FHIR resource updates, use **ETags** (`If-Match` header) for optimistic concurrency. The HAPI FHIR server supports this natively.

---

## 5. Clinical Safety Considerations

### 5.1 Stale Data Warnings

This is the highest-risk area. A nurse seeing 2-hour-old vitals thinking they're current is a patient safety issue.

**Required UI elements:**

```
┌──────────────────────────────────────────────────────┐
│  ⚠ OFFLINE MODE — Data last synced 14 min ago        │
│  Vitals may not reflect current patient status        │
│  [Refresh]                                            │
└──────────────────────────────────────────────────────┘
```

**Staleness thresholds (color-coded):**

| Age | Indicator | Color |
|---|---|---|
| < 5 min | "Live" dot | Green (#51CF66) |
| 5–15 min | "Synced X min ago" | Yellow (#FFA94D) |
| 15–60 min | "Stale — last synced X min ago" | Orange (#FFA94D) |
| > 60 min | "CRITICAL — Data > 1 hour old" | Red (#FF4444) |
| Offline | "OFFLINE — No connection" | Red + pulsing |

### 5.2 Per-Panel Staleness

Each panel should show its own sync timestamp, not just a global one:
- Vitals: most time-sensitive (15min TTL)
- Labs: less time-sensitive (1h TTL)
- Meds: moderate (30min TTL)

### 5.3 Data Freshness in FHIR Resources

Each cached resource carries `meta.lastUpdated` from the FHIR server. Compare this with `fetchedAt` (our local cache timestamp):
- If `meta.lastUpdated` on server > our `fetchedAt` → data is stale
- Use `If-None-Match` (ETag) on refresh to avoid downloading unchanged resources

### 5.4 Offline Read-Only Mode

When offline:
- **Disable any future write actions** (SBAR notes save, medication admin documentation)
- **Show clear "read-only" badge** in the header
- **Log all offline access** for audit trail (store in IndexedDB, sync when online)

### 5.5 Data Purge / Session End

- On logout: clear all cached FHIR data from IndexedDB
- On browser storage pressure: LRU eviction, P0 resources last
- Provide manual "Clear Cache" button in settings

---

## 6. Phased Implementation Plan

### Phase 1: Foundation (Week 1–2)

**Goal:** App works offline with cached data, no data loss on disconnect.

- [ ] Add `vite-plugin-pwa` with precaching for app shell
- [ ] Add `dexie` dependency, define FHIR resource schema
- [ ] Create `useFhirSearchOffline` hook:
  - Reads from IndexedDB on mount (immediate render)
  - Fetches from network in background
  - Writes successful responses to IndexedDB
  - Returns `isStale`, `lastSyncedAt` alongside existing fields
- [ ] Add offline indicator bar (global, top of app)
- [ ] Add `manifest.json` for PWA installability
- [ ] Test: kill network, verify dashboard loads with cached data

**Risk:** Low. Read-only, additive changes.

### Phase 2: Staleness & Sync Intelligence (Week 3)

**Goal:** Nurse always knows data freshness, automatic refresh on reconnect.

- [ ] Add staleness indicators per panel (colored dots + timestamps)
- [ ] Add network status listener (`navigator.onLine` + `online`/`offline` events)
- [ ] Auto-refresh on network restore
- [ ] Add manual refresh button per panel
- [ ] Implement TTL-based auto-refresh (vitals: 15min, labs: 1h, etc.)
- [ ] Add `If-None-Match` (ETag) support for efficient refreshes

**Risk:** Low-Medium. Main risk is stale data not being clearly communicated.

### Phase 3: PWA Polish (Week 4)

**Goal:** Installable bedside app with proper lifecycle management.

- [ ] Design and add PWA icons (192x192, 512x512)
- [ ] Configure `display: 'standalone'` and `orientation: 'landscape'`
- [ ] Implement SW update flow (DHIS2 pattern: notify user, confirm reload)
- [ ] Add "Update Available" notification in header
- [ ] Test on Android Chrome (install, offline, background sync)
- [ ] Test on iOS Safari (install, offline — no background sync expected)

**Risk:** Medium. SW lifecycle bugs are notorious. DHIS2's pattern is battle-tested.

### Phase 4: Write Support (Future — if needed)

**Goal:** SBAR notes and medication documentation work offline.

- [ ] Add IndexedDB outbox for pending writes
- [ ] Implement Background Sync API for write queue
- [ ] Add conflict resolution UI (ETag mismatch handling)
- [ ] Add audit log for offline actions

**Risk:** High. Clinical writes offline require careful conflict resolution and audit trails.

---

## 7. Technology Recommendations

### 7.1 Core Dependencies

| Library | Version | Purpose | Size (gzipped) |
|---|---|---|---|
| `vite-plugin-pwa` | ^0.21.x | PWA + Workbox integration | ~0 (build-time) |
| `workbox-window` | ^7.x | SW lifecycle management in app | ~4KB |
| `dexie` | ^4.x | IndexedDB wrapper | ~7KB |
| `idb-keyval` | ^6.x | (Alternative to Dexie, simpler) | ~0.6KB |

### 7.2 Why Dexie over idb-keyval

- Dashboard queries FHIR resources by `patientId` + `resourceType` — needs indexing
- Dexie supports compound indexes: `db.resources.where({ patientId, resourceType }).toArray()`
- idb-keyval is key-only — would need manual index management
- Dexie's migration support matters when FHIR schema evolves

### 7.3 What NOT to Add

- **Redux/Zustand** — overkill. Current `useState`/`useMemo` pattern is fine for this app size.
- **Apollo/URQL** — the dashboard doesn't use GraphQL.
- **RxDB/PouchDB** — heavy, designed for bidirectional sync. Overkill for read-only v1.
- **Service Worker hand-rolled** — DHIS2's experience proves Workbox is the right choice.

### 7.4 Medplum SDK Integration

Keep using `MedplumClient` for network requests. The offline layer sits **between** the hook and the SDK:

```
React Component
    ↓
useFhirSearchOffline (new)
    ├── Dexie.read() → immediate render
    └── medplum.searchResources() → Dexie.write() → update render
```

No changes to `medplum.ts` needed for Phase 1.

---

## 8. Estimated Effort and Risks

### 8.1 Effort Estimate

| Phase | Effort | Risk |
|---|---|---|
| Phase 1: Foundation | 3–5 days | Low |
| Phase 2: Staleness & Sync | 2–3 days | Low-Medium |
| Phase 3: PWA Polish | 2–3 days | Medium |
| **Total v1** | **7–11 days** | |
| Phase 4: Write Support | 5–8 days | High |

### 8.2 Key Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SW caches stale app version | Medium | High | Use DHIS2's update flow (notify + confirm reload) |
| IndexedDB quota exceeded on tablet | Low | Medium | LRU eviction, max 500 resources per patient |
| iOS Safari PWA limitations | Certain | Medium | Document limitations, test on iOS, no background sync |
| Nurse trusts stale vitals | Medium | Critical | Prominent staleness indicators, color-coded, per-panel |
| Dexie schema migration on update | Low | Medium | Dexie handles version bumps; test migration path |
| HAPI FHIR server returns non-deterministic search results | Medium | Low | Cache by query string + sort order; invalidate on patient switch |

### 8.3 Success Criteria

1. Dashboard loads within 2 seconds on repeat visit (from cache)
2. Dashboard is fully functional with zero network connectivity
3. Offline state is clearly communicated to the nurse
4. Data staleness is visible and color-coded per panel
5. App is installable on Android Chrome as a PWA
6. No data lost on browser restart

---

## 9. Reference Implementations

| Project | Relevance | Key Takeaway |
|---|---|---|
| **DHIS2 App Platform** | Health info system, 90+ countries | SW lifecycle management is the hardest part; use Workbox |
| **CrisisCore Pain Tracker** | Offline-first health PWA | Three-layer storage model (state cache → IndexedDB → encrypted vault) |
| **WellAlly** | React + Dexie + Workbox PWA | Production pattern for health data offline |
| **Google Android FHIR SDK** | Offline FHIR client (Android) | Sync engine design, conflict resolution patterns |
| **Medplum SDK** | Current stack | `getCached()` + `ClientStorage` exist but aren't sufficient for search caching |

---

## 10. Recommendation Summary

**Start with Phase 1.** The dashboard is read-only, which makes offline-first dramatically simpler than bidirectional sync. The core change is:

1. Add `vite-plugin-pwa` for shell caching + installability
2. Add `dexie` for durable FHIR resource storage
3. Wrap `useFhirSearch` to read-from-cache-first, fetch-in-background

This gives 80% of the offline value (dashboard works when network drops) with 20% of the effort. Phases 2–3 add polish. Phase 4 (writes) should only be tackled if SBAR notes or medication documentation become write targets.
