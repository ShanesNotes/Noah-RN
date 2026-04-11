import { useState, useRef, useCallback, useEffect } from 'react';
import { fhirSearch } from '../fhir/client';
import type { FhirResource } from '../fhir/types';

interface FhirSearchState<T extends FhirResource> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFhirSearch<T extends FhirResource>(
  resourceType: string,
  query: string,
  enabled = true,
): FhirSearchState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  const doFetch = useCallback(() => {
    if (!enabled) return;
    const id = ++fetchId.current;
    setLoading(true);
    setError(null);
    fhirSearch<T>(resourceType, query)
      .then(results => {
        if (id === fetchId.current) setData(results);
      })
      .catch(err => {
        if (id === fetchId.current) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (id === fetchId.current) setLoading(false);
      });
  }, [resourceType, query, enabled]);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}
