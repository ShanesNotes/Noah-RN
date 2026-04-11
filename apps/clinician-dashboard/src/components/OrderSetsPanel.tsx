import { useState } from 'react';
import { Text } from '@mantine/core';
import { colors } from '../theme';

interface OrderSet {
  id: string;
  name: string;
  category: string;
  items: Array<{ text: string; category: 'med' | 'lab' | 'nursing' | 'monitoring' | 'consult' }>;
}

const ORDER_SETS: OrderSet[] = [
  {
    id: 'icu-admission',
    name: 'ICU Admission',
    category: 'General',
    items: [
      { text: 'Continuous telemetry monitoring', category: 'monitoring' },
      { text: 'Arterial line placement / continuous BP monitoring', category: 'monitoring' },
      { text: 'Pulse oximetry continuous', category: 'monitoring' },
      { text: 'BMP, CBC, Coags, Lactate on admission', category: 'lab' },
      { text: 'BMP q6h x 24h, then daily', category: 'lab' },
      { text: 'Chest X-ray (portable) on admission', category: 'lab' },
      { text: 'DVT prophylaxis: Heparin 5000 units SubQ q8h', category: 'med' },
      { text: 'Stress ulcer prophylaxis: Famotidine 20mg IV q12h', category: 'med' },
      { text: 'Head of bed elevation 30-45 degrees', category: 'nursing' },
      { text: 'Oral care q4h', category: 'nursing' },
      { text: 'Strict I&O', category: 'nursing' },
      { text: 'Daily weights', category: 'nursing' },
      { text: 'Fall risk precautions', category: 'nursing' },
      { text: 'Skin integrity assessment q shift', category: 'nursing' },
    ],
  },
  {
    id: 'sepsis-bundle',
    name: 'Sepsis Bundle (SSC 2026)',
    category: 'Critical Care',
    items: [
      { text: 'Lactate level STAT', category: 'lab' },
      { text: 'Blood cultures x2 (before antibiotics)', category: 'lab' },
      { text: 'CBC, BMP, hepatic panel, coags, procalcitonin', category: 'lab' },
      { text: 'Urinalysis with culture', category: 'lab' },
      { text: 'Broad-spectrum antibiotics within 1 hour', category: 'med' },
      { text: 'Crystalloid 30 mL/kg for hypotension or lactate >= 4', category: 'med' },
      { text: 'Norepinephrine if MAP < 65 after fluids', category: 'med' },
      { text: 'Repeat lactate within 2-4 hours if initial elevated', category: 'lab' },
      { text: 'Reassess volume status and tissue perfusion', category: 'nursing' },
      { text: 'Continuous MAP monitoring (art line preferred)', category: 'monitoring' },
      { text: 'Urine output monitoring (goal >= 0.5 mL/kg/hr)', category: 'monitoring' },
      { text: 'Source control evaluation', category: 'consult' },
    ],
  },
  {
    id: 'post-intubation',
    name: 'Post-Intubation',
    category: 'Airway',
    items: [
      { text: 'Verify ETT placement: auscultation + chest X-ray', category: 'monitoring' },
      { text: 'Document ETT size and depth at teeth/lip', category: 'nursing' },
      { text: 'Ventilator: AC/VC, TV 6-8 mL/kg IBW, RR 14-18, FiO2 100% (wean per ABG)', category: 'monitoring' },
      { text: 'Sedation: Propofol 5-50 mcg/kg/min OR Midazolam 1-5 mg/hr', category: 'med' },
      { text: 'Analgesia: Fentanyl 25-100 mcg/hr', category: 'med' },
      { text: 'RASS target: -2 to 0', category: 'nursing' },
      { text: 'ABG 30 min post-intubation', category: 'lab' },
      { text: 'HOB 30-45 degrees', category: 'nursing' },
      { text: 'Oral care q4h with chlorhexidine', category: 'nursing' },
      { text: 'Inline suction available', category: 'nursing' },
      { text: 'OG/NG tube placement', category: 'nursing' },
    ],
  },
];

const categoryColors: Record<string, string> = {
  med: '#22C55E',
  lab: '#8B5CF6',
  nursing: colors.info,
  monitoring: colors.warning,
  consult: '#EC4899',
};

const categoryLabels: Record<string, string> = {
  med: 'MED',
  lab: 'LAB',
  nursing: 'RN',
  monitoring: 'MON',
  consult: 'CONSULT',
};

export function OrderSetsPanel() {
  const [selected, setSelected] = useState<string>('icu-admission');
  const orderSet = ORDER_SETS.find(o => o.id === selected)!;

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      {/* Left: Order set list */}
      <div style={{ width: 240, borderRight: `1px solid ${colors.border}`, paddingRight: 16 }}>
        <Text ff="monospace" fz={11} fw={600} c={colors.textSecondary} mb={12} style={{ letterSpacing: '0.1em' }}>
          ORDER SETS
        </Text>
        {ORDER_SETS.map(os => (
          <button
            key={os.id}
            onClick={() => setSelected(os.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selected === os.id ? colors.border : 'transparent',
              border: `1px solid ${selected === os.id ? colors.info : 'transparent'}`,
              borderRadius: 6, padding: '10px 12px', marginBottom: 6, cursor: 'pointer',
            }}
          >
            <Text ff="monospace" fz={12} fw={600} c={colors.textPrimary}>{os.name}</Text>
            <Text fz={10} c={colors.textMuted}>{os.category}</Text>
          </button>
        ))}
      </div>

      {/* Right: Order set details */}
      <div style={{ flex: 1 }}>
        <Text ff="monospace" fz={14} fw={700} c={colors.textPrimary} mb={4}>{orderSet.name}</Text>
        <Text fz={11} c={colors.textMuted} mb={16}>{orderSet.items.length} items</Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {orderSet.items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 10px', borderRadius: 4,
              background: i % 2 === 0 ? 'transparent' : `${colors.surface}80`,
            }}>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700,
                color: categoryColors[item.category], minWidth: 52,
                padding: '2px 6px', borderRadius: 3,
                background: `${categoryColors[item.category]}15`,
                textAlign: 'center',
              }}>
                {categoryLabels[item.category]}
              </span>
              <Text fz={12} c={colors.textPrimary}>{item.text}</Text>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
