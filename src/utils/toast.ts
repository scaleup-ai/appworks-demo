import { toast, ToastOptions } from 'react-toastify'

const lastShown = new Map<string, number>()
const MIN_INTERVAL_MS = 500

export function showToast(message: string, options?: ToastOptions) {
  try {
    const now = Date.now()
    const last = lastShown.get(message) || 0
    if (message === '' || now - last < MIN_INTERVAL_MS) return
    lastShown.set(message, now)
    toast(message, options)
  } catch {
    // swallow errors to avoid crashing non-UI code
  }
}

export default showToast
