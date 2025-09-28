/* eslint-disable @typescript-eslint/no-explicit-any */
type HandlerDeps = any;

/**
 * Process the Xero OAuth callback. Flattened control flow with early returns.
 * This function intentionally avoids deep nesting and updates component state
 * via the provided setters.
 */
export async function processXeroCallback(deps: HandlerDeps): Promise<void> {
  const {
    searchParams,
    paramsState,
    navigate,
    dispatch,
    showToast,
    axiosClient,
    AuthStorage,
    setSelectedOpenIdSub,
    setCurrentOpenIdSub,
    setXeroConnected,
    selectTenant,
    getXeroToken,
    handleOAuthRedirect,
    getIntegrationStatus,
    startXeroAuth,
    setProcessing,
    setErrorMessage,
  } = deps;

  setProcessing(true);

  const code = searchParams.get('code') || undefined;
  const stateFromQuery = searchParams.get('state') || undefined;
  const state = stateFromQuery || paramsState;
  const error = searchParams.get('error');

  if (error) {
    showToast(`Xero OAuth error: ${error}`, { type: 'error' });
    setErrorMessage(`Xero OAuth error: ${error}`);
    setProcessing(false);
    return;
  }

  if (!code) {
    showToast('Missing authorization code. Please restart Xero sign-in.', { type: 'error' });
    setErrorMessage('Missing authorization code. Please restart Xero sign-in.');
    setProcessing(false);
    return;
  }

  // guard against double processing
  const guardKey = `xero_oauth_callback_inflight:${code}`;
  try {
    if (sessionStorage.getItem(guardKey) === '1') {
      setProcessing(false);
      return;
    }
    sessionStorage.setItem(guardKey, '1');
  } catch {
    // ignore storage errors
  }

  try {
    const response = await handleOAuthRedirect({ code, state: state || '' });

    if (response.status === 200) {
      const payload = (response.data || {}) as any;

      // If tenants present, handle 1 vs many
      const tenants = Array.isArray(payload.tenants) ? payload.tenants : [];
      if (tenants.length > 0) {
        if (tenants.length === 1) {
          const single = tenants[0] as any;
          const tid = single.tenantId || single.tenant_id || '';
          let maybeOpenId = single.openid_sub || single.openidSub || null;

          if (!maybeOpenId) {
            const clientId = single.clientId || single.client_id || single.id || null;
            if (clientId && tid) {
              try {
                const meta = await getXeroToken(String(clientId), String(tid));
                maybeOpenId = (meta && (meta.openid_sub || meta.openidSub)) || maybeOpenId;
              } catch {
                // ignore token lookup failure
              }
            }
          }

          if (maybeOpenId) {
            try { AuthStorage.setSelectedOpenIdSub(String(maybeOpenId)); } catch (e) { console.debug('setSelectedOpenIdSub failed', e); }
            try { dispatch(setSelectedOpenIdSub(String(maybeOpenId))); } catch (e) { console.debug('dispatch setSelectedOpenIdSub failed', e); }
            try {
              if (axiosClient && axiosClient.defaults && axiosClient.defaults.headers) {
                axiosClient.defaults.headers.common['X-Openid-Sub'] = String(maybeOpenId);
              }
            } catch (e) { console.debug('axios seed failed', e); }
            try { dispatch(setCurrentOpenIdSub(String(maybeOpenId))); } catch (e) { console.debug('dispatch setCurrentOpenIdSub failed', e); }
          }

          if (tid) {
            try { AuthStorage.setSelectedTenantId(tid); } catch (e) { console.debug('setSelectedTenantId failed', e); }
            try { dispatch(selectTenant(tid)); } catch (e) { console.debug('dispatch selectTenant failed', e); }
          }

          dispatch(setXeroConnected());
          showToast('Successfully connected to Xero!', { type: 'success' });
          // navigate handled by caller (pass navigate) - do both router and hard redirect
          try { navigate('/dashboard'); } catch (e) { console.debug('navigate failed', e); }
          setTimeout(() => { if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') window.location.replace('/dashboard'); }, 250);
          return;
        }

        // multiple tenants: let the UI select
    try { navigate('/select-tenant', { state: { tenants } }); } catch (e) { console.debug('navigate to select-tenant failed', e); window.location.replace('/select-tenant'); }
        return;
      }

      // top-level openid_sub fallback
      const topOpenId = (response.data && (response.data.openid_sub || response.data.openidSub)) || null;
      if (topOpenId) {
        try { AuthStorage.setSelectedOpenIdSub(String(topOpenId)); } catch (e) { console.debug('setSelectedOpenIdSub failed', e); }
        try { dispatch(setSelectedOpenIdSub(String(topOpenId))); } catch (e) { console.debug('dispatch setSelectedOpenIdSub failed', e); }
        try {
          if (axiosClient && axiosClient.defaults && axiosClient.defaults.headers) {
            axiosClient.defaults.headers.common['X-Openid-Sub'] = String(topOpenId);
          }
        } catch (e) { console.debug('axios seed failed', e); }
        try { dispatch(setCurrentOpenIdSub(String(topOpenId))); } catch (e) { console.debug('dispatch setCurrentOpenIdSub failed', e); }
      } else {
        try { dispatch(setCurrentOpenIdSub(null)); } catch (e) { console.debug('dispatch setCurrentOpenIdSub failed', e); }
      }

      dispatch(setXeroConnected());
      showToast('Successfully connected to Xero!', { type: 'success' });
  try { navigate('/dashboard'); } catch (e) { console.debug('navigate failed', e); }
      setTimeout(() => { if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') window.location.replace('/dashboard'); }, 250);
      return;
    }

    if (response.status === 409) {
      showToast('Session already processed. Checking connection…', { type: 'info' });
      try {
        const statusRespRaw = await getIntegrationStatus();
        const statusResp = statusRespRaw as any;
        const integrationStatus = statusResp?.integrationStatus || null;
        const isConnected = (integrationStatus && integrationStatus.success === true) || statusResp?.connected === true || Boolean(statusResp?.tenantId);
        if (isConnected) {
          dispatch(setXeroConnected());
          try { navigate('/dashboard'); } catch (e) { console.debug('navigate failed', e); }
          return;
        }
      } catch (e) {
        console.debug('getIntegrationStatus failed', e);
      }

      showToast('Session expired. Restarting Xero sign-in…', { type: 'warning' });
      try {
        const data = await startXeroAuth('json');
        if (data && (data as any).url) {
          window.location.href = (data as any).url;
          return;
        }
      } catch (e) {
        console.debug('startXeroAuth failed', e);
      }

      setErrorMessage('Session expired. Please try again.');
      setProcessing(false);
      return;
    }

    throw new Error(`OAuth callback failed with status ${response.status}`);
  } catch (err) {
    // Final error handling
    console.error('OAuth callback error:', err);
    showToast('Failed to complete Xero authentication', { type: 'error' });
    setErrorMessage('Failed to complete Xero authentication');
    setProcessing(false);
  } finally {
    try { sessionStorage.removeItem(guardKey); } catch (e) { console.debug('sessionStorage removeItem failed', e); }
  }
}
