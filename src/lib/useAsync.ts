import { useCallback, useEffect, useState } from 'react';
import { errMsg } from './api';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    fn().then((d) => live && setData(d)).catch((e) => live && setError(errMsg(e))).finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
