import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import axiosClient from '../apis/axios-client';
import { setTenants } from '../store/slices/auth.slice';
import { parseAndDedupTenants } from '../handlers/shared.handler';
import { useApi } from './useApi';

export function useTenants() {
  const dispatch = useDispatch();

  const fetchTenants = useCallback(async () => {
    const resp = await axiosClient.get("/api/v1/xero/organisations");
    return parseAndDedupTenants(resp.data || []);
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
