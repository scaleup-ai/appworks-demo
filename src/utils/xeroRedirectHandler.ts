import { handleOAuthRedirect } from '../apis/xero'
import { AppDispatch } from '../store/store'
import { login } from '../store/authSlice'

/**
 * Check the current window URL for an OAuth redirect from Xero.
 * If a code is present, call the backend endpoint and update auth state.
 *
 * This function is intentionally small and takes the app's dispatch so it
 * can be called from components without importing the store directly.
 */
export default async function handleXeroRedirect(dispatch: AppDispatch) {
  if (typeof window === 'undefined') return

  try {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    // Nothing to do if we didn't receive an authorization code
    if (!code) return

    // Call backend to finish the OAuth flow (backend may exchange code for tokens)
    const resp = await handleOAuthRedirect({ code, state: state || undefined })

    if (resp && resp.status >= 200 && resp.status < 300) {
      // Mark the user as authenticated. We don't expect user details here,
      // so use a simple marker. Adjust if your backend returns user info.
      dispatch(login('xero'))

      // Clean the URL so the code/state aren't left visible
      try {
        const clean = window.location.pathname + window.location.hash
        window.history.replaceState(null, '', clean)
      } catch { }
    } else {
      // Backend returned non-2xx. Log and optionally show a message.
      // Keep the query params so developers can inspect them if needed.
      // eslint-disable-next-line no-console
      console.error('Xero redirect handling failed', resp)
      try {
        window.alert('Xero authentication failed — see console for details.')
      } catch { }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error processing Xero redirect', err)
    try {
      window.alert('Error processing Xero redirect — see console for details.')
    } catch { }
  }
}
