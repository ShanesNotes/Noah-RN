import { useEffect, useRef, useState } from 'react';
import type { VitalsSnapshot } from './types';

export type StreamState =
  | { status: 'connecting' }
  | { status: 'open'; snapshot: VitalsSnapshot | null }
  | { status: 'error'; message: string };

export function useVitalsStream(url = '/api/engine/stream'): StreamState {
  const [state, setState] = useState<StreamState>({ status: 'connecting' });
  const retryRef = useRef(0);

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    function open() {
      if (cancelled) return;
      setState(prev => (prev.status === 'open' ? prev : { status: 'connecting' }));
      es = new EventSource(url);
      es.addEventListener('open', () => {
        retryRef.current = 0;
        setState({ status: 'open', snapshot: null });
      });
      es.addEventListener('message', event => {
        try {
          const snap = JSON.parse(event.data) as VitalsSnapshot;
          setState({ status: 'open', snapshot: snap });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'parse error';
          setState({ status: 'error', message });
        }
      });
      es.addEventListener('error', () => {
        if (cancelled) return;
        es?.close();
        es = null;
        const attempt = retryRef.current++;
        const delayMs = Math.min(1_000 * 2 ** attempt, 10_000);
        setState({ status: 'error', message: `disconnected — retrying in ${delayMs}ms` });
        setTimeout(open, delayMs);
      });
    }

    open();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [url]);

  return state;
}
