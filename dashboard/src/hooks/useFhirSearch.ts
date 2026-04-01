import { useState, useRef, useCallback, useEffect } from 'react';
import { medplum } from '../medplum';

type ResourceType = Parameters<typeof medplum.searchResources>[0];
type SearchResult<T extends ResourceType> = Awaited<ReturnType<typeof medplum.searchResources<T>>>;

interface FhirSearchState<T extends ResourceType> {
  data: SearchResult<T>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFhirSearch<T extends ResourceType>(
  resourceType: T,
  query: string,
  enabled = true,
): FhirSearchState<T> {
  const [data, setData] = useState<SearchResult<T>>([] as unknown as SearchResult<T>);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  const doFetch = useCallback((rt: T, q: string) => {
    const id = ++fetchId.current;
    setError(null);
    medplum.searchResources(rt, q)
      .then(results => {
        if (id === fetchId.current) setData([...results] as SearchResult<T>);
      })
      .catch(err => {
        if (id === fetchId.current) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (id === fetchId.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    doFetch(resourceType, query);
  }, [resourceType, query, enabled, doFetch]);

  const refetch = useCallback(() => {
    setLoading(true);
    doFetch(resourceType, query);
  }, [resourceType, query, doFetch]);

  return { data, loading, error, refetch };
}
