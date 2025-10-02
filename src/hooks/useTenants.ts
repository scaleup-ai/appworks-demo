import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import axiosClient from '../apis/axios-client';
import { setTenants, logout } from '../store/slices/auth.slice';
import { parseAndDedupTenants } from '../handlers/shared.handler';
import { useApi } from './useApi';

export function useTenants() {
  const dispatch = useDispatch();

  // Keep an in-flight promise so concurrent callers get the same result.
  const inFlight = useRef<Promise<unknown[] | undefined> | undefined>(undefined);

  const fetchTenants = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const p = (async () => {
      const resp = await axiosClient.get('/api/v1/xero/organisations');
      return parseAndDedupTenants(resp.data || []);
    })();
    inFlight.current = p;
    try {
      const r = await p;
      return r;
    } finally {
      inFlight.current = undefined;
    }
  }, []);

  // useApi provides loading + toast behavior for the normal happy-path.
  const { execute: loadTenants, isLoading } = useApi(fetchTenants);

  // Wrapper that sets tenants and additionally inspects errors for the
  // special-case: 503 with message "not authenticated" -> force logout.
  const loadAndSetTenants = useCallback(async () => {
    // First try the wrapped execute (it returns undefined on error).
    const tenants = await loadTenants();
    if (tenants) {
      dispatch(setTenants(tenants));
      return;
    }

    // If execute failed (likely swallowed by useApi), call the raw fetch
    // to get the thrown Axios error so we can inspect status/message.
    try {
      const direct = await fetchTenants();
      if (direct) dispatch(setTenants(direct));
    } catch (err: unknown) {
      // Inspect Axios error shape for the special server-side message.
      // If the backend returned 503 with body containing "not authenticated"
      // treat it as an auth failure and log the user out.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr = err as any;
      const status = anyErr?.response?.status;
      const body = anyErr?.response?.data;
      const msg = typeof body === 'string' ? body : (body && (body.message || body.error)) || anyErr?.message;
      if (status === 503 && typeof msg === 'string' && msg.toLowerCase().includes('not authenticated')) {
        try {
          dispatch(logout());
        } catch {
          // swallow dispatch errors
        }
      }
    }
  }, [loadTenants, fetchTenants, dispatch]);

  return { loadTenants: loadAndSetTenants, isLoading };
}
