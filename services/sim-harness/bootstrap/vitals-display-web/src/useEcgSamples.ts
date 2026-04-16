import { useEffect, useRef, useState } from 'react';
import type { EcgSamples } from './types';

export function useEcgSamples(
  pollIntervalMs = 200,
  url = '/api/engine/ecg',
): EcgSamples | null {
  const [samples, setSamples] = useState<EcgSamples | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as EcgSamples;
        if (!cancelled) setSamples(data);
      } catch {
        // swallow; SSE connection surfaces the error indicator separately
      }
    }

    tick();
    timerRef.current = setInterval(tick, pollIntervalMs);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pollIntervalMs, url]);

  return samples;
}
