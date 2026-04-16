// MarPanel — Product B MAR chart section (Phase 4b of the three-product alignment plan).
//
// Reads both MedicationRequest (active orders) and MedicationAdministration
// (recent administrations) from the patient's chart and assembles a
// MAR-style view with computed administration state (scheduled / overdue /
// PRN / held) and ISMP high-alert flags.
//
// Write actions (chart / hold / "Verify with Noah") land in Phase 4c
// alongside the full harness-to-browser tool-invocation bridge. The
// scaffold here is read-only plus a labeled placeholder for the verify
// action so the nurse-facing shape is visible.

import { Badge, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconClockHour4, IconPill, IconShieldCheck } from '@tabler/icons-react';
import type { JSX } from 'react';
import { colors } from '../theme';
import type { MedicationRequest as MedicationRequestFacade } from './MedicationList';

// Facade loose enough to accept either our local minimal FHIR types or the
// @medplum/fhirtypes MedicationAdministration (where statusReason is
// CodeableConcept[]). The UI normalizes internally.
export interface MedicationAdministrationFacade {
  id?: string;
  status?: string;
  statusReason?:
    | { coding?: { code?: string }[]; text?: string }
    | Array<{ coding?: { code?: string }[]; text?: string }>;
  effectiveDateTime?: string;
  medicationCodeableConcept?: { text?: string; coding?: { display?: string }[] };
  request?: { reference?: string };
  performer?: { actor?: { reference?: string; display?: string } }[];
  dosage?: { text?: string };
}

function firstStatusReason(
  sr: MedicationAdministrationFacade['statusReason'],
): { coding?: { code?: string }[]; text?: string } | undefined {
  if (!sr) return undefined;
  if (Array.isArray(sr)) return sr[0];
  return sr;
}

export interface MarPanelProps {
  medications: MedicationRequestFacade[];
  administrations: MedicationAdministrationFacade[];
}

interface EnrichedEntry {
  request: MedicationRequestFacade;
  lastAdministeredAt?: string;
  lastPerformer?: string;
  state: 'scheduled' | 'overdue' | 'prn' | 'held';
  highAlert: boolean;
  highAlertReason?: string;
}

const HIGH_ALERT_KEYWORDS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /norepinephrine|levophed/i, reason: 'Vasopressor (ISMP high-alert).' },
  { pattern: /epinephrine/i, reason: 'Adrenergic agonist (ISMP high-alert).' },
  { pattern: /vasopressin/i, reason: 'Vasopressor (ISMP high-alert).' },
  { pattern: /dopamine|dobutamine/i, reason: 'Adrenergic (ISMP high-alert).' },
  { pattern: /phenylephrine/i, reason: 'Vasopressor (ISMP high-alert).' },
  { pattern: /insulin/i, reason: 'Insulin (ISMP high-alert).' },
  { pattern: /heparin|enoxaparin|warfarin/i, reason: 'Anticoagulant (ISMP high-alert).' },
  { pattern: /morphine|fentanyl|hydromorphone|oxycodone/i, reason: 'Opioid (ISMP high-alert).' },
  { pattern: /midazolam|propofol|ketamine/i, reason: 'Sedative (ISMP high-alert).' },
  { pattern: /potassium chloride|kcl/i, reason: 'Concentrated electrolyte (ISMP high-alert).' },
];

function drugName(med: MedicationRequestFacade | MedicationAdministrationFacade): string {
  return (
    med.medicationCodeableConcept?.text
    ?? med.medicationCodeableConcept?.coding?.[0]?.display
    ?? 'Unknown medication'
  );
}

function highAlertFlag(name: string): { highAlert: boolean; highAlertReason?: string } {
  for (const entry of HIGH_ALERT_KEYWORDS) {
    if (entry.pattern.test(name)) {
      return { highAlert: true, highAlertReason: entry.reason };
    }
  }
  return { highAlert: false };
}

function isPrn(req: MedicationRequestFacade): boolean {
  const dose = req.dosageInstruction?.[0];
  return Boolean(dose?.asNeededBoolean || dose?.text?.toLowerCase().includes('prn'));
}

function isHeld(req: MedicationRequestFacade): boolean {
  return (req.status ?? '').toLowerCase() === 'on-hold';
}

function enrichEntry(
  request: MedicationRequestFacade,
  administrations: MedicationAdministrationFacade[],
): EnrichedEntry {
  const requestRef = request.id ? `MedicationRequest/${request.id}` : undefined;
  const relatedAdmins = requestRef
    ? administrations.filter((admin) => admin.request?.reference === requestRef)
    : [];
  const completed = relatedAdmins
    .filter((admin) => (admin.status ?? '').toLowerCase() === 'completed')
    .sort((a, b) => (b.effectiveDateTime ?? '').localeCompare(a.effectiveDateTime ?? ''));
  const latest = completed[0];
  const name = drugName(request);
  const alert = highAlertFlag(name);

  let state: EnrichedEntry['state'] = 'scheduled';
  if (isHeld(request)) state = 'held';
  else if (isPrn(request)) state = 'prn';

  return {
    request,
    lastAdministeredAt: latest?.effectiveDateTime,
    lastPerformer:
      latest?.performer?.[0]?.actor?.display
      ?? latest?.performer?.[0]?.actor?.reference,
    state,
    ...alert,
  };
}

function stateBadgeTone(state: EnrichedEntry['state']): 'blue' | 'red' | 'violet' | 'gray' {
  switch (state) {
    case 'overdue':
      return 'red';
    case 'prn':
      return 'violet';
    case 'held':
      return 'gray';
    default:
      return 'blue';
  }
}

function MarRow({ entry }: { entry: EnrichedEntry }): JSX.Element {
  const name = drugName(entry.request);
  const dosage = entry.request.dosageInstruction?.[0]?.text || 'No dosage information';
  const route = entry.request.dosageInstruction?.[0]?.route?.text;

  return (
    <div
      data-testid={`mar-row-${entry.request.id ?? 'unknown'}`}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Text fz={15} fw={600} c={colors.textPrimary}>
          {name}
        </Text>
        <Badge variant="light" color={stateBadgeTone(entry.state)} radius="sm" size="sm">
          {entry.state.toUpperCase()}
        </Badge>
        {entry.highAlert && (
          <Tooltip label={entry.highAlertReason ?? 'High-alert medication'}>
            <Badge
              variant="filled"
              color="yellow"
              radius="sm"
              size="sm"
              leftSection={<IconAlertTriangle size={10} />}
            >
              HIGH-ALERT
            </Badge>
          </Tooltip>
        )}
      </div>
      <Text fz={13} c={colors.textSecondary} lh={1.5}>
        {dosage}
      </Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPill size={14} color={colors.textMuted} />
          <Text ff="monospace" fz={11} c={colors.textMuted}>
            {route ?? 'route unknown'}
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconClockHour4 size={14} color={colors.textMuted} />
          <Text ff="monospace" fz={11} c={colors.textMuted}>
            {entry.lastAdministeredAt
              ? `Last: ${entry.lastAdministeredAt.slice(0, 16).replace('T', ' ')}${entry.lastPerformer ? ` · ${entry.lastPerformer}` : ''}`
              : 'Not yet administered this shift'}
          </Text>
        </div>
        <Tooltip label="Routes to the Noah RN agent harness via MCP once the browser-to-harness bridge lands (Phase 4c).">
          <Badge
            variant="outline"
            color="gray"
            radius="sm"
            size="sm"
            leftSection={<IconShieldCheck size={10} />}
          >
            VERIFY WITH NOAH — PENDING
          </Badge>
        </Tooltip>
      </div>
    </div>
  );
}

export function MarPanel({ medications, administrations }: MarPanelProps): JSX.Element {
  const active = medications.filter((m) => (m.status ?? '').toLowerCase() === 'active' || (m.status ?? '').toLowerCase() === 'on-hold');
  const entries = active.map((req) => enrichEntry(req, administrations));

  const recentAdmins = administrations
    .filter((admin) => {
      const t = admin.effectiveDateTime ?? '';
      if (!t) return false;
      const now = Date.now();
      return now - new Date(t).getTime() < 24 * 60 * 60 * 1000;
    })
    .slice(0, 10);

  return (
    <div data-testid="mar-panel" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            component="h2"
            ff="monospace"
            fz={11}
            fw={700}
            c={colors.textMuted}
            tt="uppercase"
            style={{ letterSpacing: '0.08em' }}
          >
            Active MAR
          </Text>
          <Badge variant="outline" color="gray" radius="sm">
            {entries.length}
          </Badge>
        </div>
        {entries.length === 0 ? (
          <Text fz={13} c={colors.textSecondary}>
            No active medication orders.
          </Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entries.map((entry, i) => (
              <MarRow key={entry.request.id ?? `active-${i}`} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            component="h2"
            ff="monospace"
            fz={11}
            fw={700}
            c={colors.textMuted}
            tt="uppercase"
            style={{ letterSpacing: '0.08em' }}
          >
            Recent administrations (24h)
          </Text>
          <Badge variant="outline" color="gray" radius="sm">
            {recentAdmins.length}
          </Badge>
        </div>
        {recentAdmins.length === 0 ? (
          <Text fz={13} c={colors.textSecondary}>
            No medication administrations in the last 24 hours.
          </Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentAdmins.map((admin, i) => (
              <div
                key={admin.id ?? `admin-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 14px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  background: colors.surface,
                }}
              >
                <Text fz={13} c={colors.textPrimary} fw={500} style={{ minWidth: 160 }}>
                  {drugName(admin)}
                </Text>
                <Text ff="monospace" fz={11} c={colors.textMuted}>
                  {admin.effectiveDateTime?.slice(0, 16).replace('T', ' ') ?? 'time unknown'}
                </Text>
                <Text fz={12} c={colors.textSecondary}>
                  {admin.status?.toUpperCase() ?? ''}
                  {firstStatusReason(admin.statusReason)?.text
                    ? ` — ${firstStatusReason(admin.statusReason)?.text}`
                    : ''}
                </Text>
                {admin.performer?.[0]?.actor?.display && (
                  <Text ff="monospace" fz={11} c={colors.textMuted} style={{ marginLeft: 'auto' }}>
                    {admin.performer[0].actor.display}
                  </Text>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
