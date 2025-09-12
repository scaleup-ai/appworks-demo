import { handleOAuthRedirect } from '../apis/xero.api'
import { AppDispatch } from '../store/store'
import { getRedirectHandled, completeLoginFromRedirect } from '../store/authSlice'
import showToast from './toast'

/**
 * Check the current window URL for an OAuth redirect from Xero.
 * If a code is present, call the backend endpoint and update auth state.
 *
 * This function is intentionally small and takes the app's dispatch so it
 * can be called from components without importing the store directly.
 */
export default async function handleXeroRedirect(dispatch: AppDispatch): Promise<boolean> {
  if (typeof window === 'undefined') return false
  // fast-fail if we've already handled a redirect this session
  if (getRedirectHandled()) return false

  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code) return false

  try {
    const response = await handleOAuthRedirect({ code, state: state || undefined })
    if (response && response.status >= 200 && response.status < 300) {
      // single dispatch: complete login & mark redirect handled
      dispatch(completeLoginFromRedirect('xero') as any)

      // clean URL (ignore replace errors such as cross-origin history issues)
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      } catch (e) {
        // ignore - some hosts or embedded contexts may reject replaceState
      }
      return true
    }

    // backend returned non-2xx — surface a concise toast with available message
    const msg = response?.data?.message || response?.statusText || 'Xero authentication failed.'
    showToast(`Xero authentication failed: ${msg}`, { type: 'error' })
    return false
  } catch (err) {
    const message = (err as any)?.message || String(err)
    showToast(`Error processing Xero redirect: ${message}`, { type: 'error' })
    return false
  }
}
