import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import axiosClient from '../apis/axios-client';
import BACKEND_ROUTES from '../router/backend.routes';
import { setTenants } from '../store/slices/auth.slice';
import { parseAndDedupTenants } from '../handlers/shared.handler';
import { useApi } from './useApi';

export function useTenants() {
  const dispatch = useDispatch();

  // Avoid duplicate concurrent fetches by keeping an in-flight promise.
  const inFlight: { p?: Promise<unknown[]> } = {};
  const fetchTenants = useCallback(async () => {
    if (inFlight.p) return inFlight.p;
    const p = (async () => {
      const resp = await axiosClient.get(BACKEND_ROUTES?.xero?.organisations || "/api/v1/xero/organisations");
      return parseAndDedupTenants(resp.data || []);
    })();
    inFlight.p = p;
    try {
      const r = await p;
      return r;
    } finally {
      inFlight.p = undefined;
    }
  }, []);

  const { execute: loadTenants, isLoading } = useApi(fetchTenants);

  const loadAndSetTenants = useCallback(async () => {
    const tenants = await loadTenants();
    if (tenants) {
      dispatch(setTenants(tenants));
    }
  }, [loadTenants, dispatch]);

  return { loadTenants: loadAndSetTenants, isLoading };
}
