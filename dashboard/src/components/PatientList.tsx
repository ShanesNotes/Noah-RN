import { useState, useMemo } from 'react';
import { formatHumanName } from '@medplum/core';
import { Loader, Text } from '@mantine/core';
import { medplum } from '../medplum';
import { colors } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';

type Patient = Awaited<ReturnType<typeof medplum.searchResources<'Patient'>>>[number];

interface PatientListProps {
  onSelect: (patient: Patient) => void;
  selectedId?: string;
}

export function PatientList({ onSelect, selectedId }: PatientListProps) {
  const [search, setSearch] = useState('');
  const { data: patients, loading, error } = useFhirSearch(
    'Patient',
    '_count=100&_elements=id,name,birthDate,gender',
  );

  const filtered = useMemo(() => {
    if (!search) return patients;
    const q = search.toLowerCase();
    return patients.filter(p => {
      const name = formatHumanName(p.name?.[0])?.toLowerCase() ?? '';
      return name.includes(q) || p.id?.includes(q);
    });
  }, [patients, search]);

  return (
    <>
      <div style={{ padding: '0 12px 8px' }}>
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            padding: '6px 10px',
            color: colors.textPrimary,
            fontFamily: '"Outfit", sans-serif',
            fontSize: 12,
            outline: 'none',
          }}
        />
      </div>

      {loading && (
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Loader size="sm" color={colors.info} />
        </div>
      )}

      {error && (
        <Text fz="xs" c={colors.critical} p="sm">{error}</Text>
      )}

      {!loading && !error && filtered.map(patient => {
        const active = patient.id === selectedId;
        const name = formatHumanName(patient.name?.[0]) || 'Unknown';
        return (
          <button
            key={patient.id}
            onClick={() => onSelect(patient)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: active ? colors.border : 'transparent',
              border: 'none',
              borderLeft: active ? `2px solid ${colors.info}` : '2px solid transparent',
              padding: '8px 12px',
              cursor: 'pointer',
              transition: 'all 0.1s ease',
            }}
            onMouseEnter={e => {
              if (!active) e.currentTarget.style.background = colors.surfaceHover;
            }}
            onMouseLeave={e => {
              if (!active) e.currentTarget.style.background = 'transparent';
            }}
          >
            <Text fz={12} fw={active ? 600 : 400} c={colors.textPrimary} truncate>
              {name}
            </Text>
            <Text fz={10} c={colors.textMuted}>
              {[patient.birthDate, patient.gender].filter(Boolean).join(' · ')}
            </Text>
          </button>
        );
      })}

      {!loading && !error && filtered.length === 0 && (
        <Text fz="xs" c={colors.textMuted} ta="center" py="md">
          {search ? 'No matches' : 'No patients'}
        </Text>
      )}
    </>
  );
}
