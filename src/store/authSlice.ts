import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { AppDispatch } from './store'

const STORAGE_KEY = 'xero_redirect_handled'

export function getRedirectHandled(): boolean {
  try {
    return !!sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}

export function setRedirectHandledStorage() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch { }
}

interface AuthState {
  isAuthenticated: boolean
  user: string | null
  redirectHandled: boolean
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  redirectHandled: getRedirectHandled(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true
      state.user = action.payload
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
    },
    // internal reducer to set the flag in redux state
    internalMarkRedirectHandled: (state) => {
      state.redirectHandled = true
    },
    internalClearRedirectHandled: (state) => {
      state.redirectHandled = false
    },
  },
})

const { internalMarkRedirectHandled, internalClearRedirectHandled, login, logout } = authSlice.actions

// Thunk action that manages sessionStorage as a side-effect and updates state.
export const markRedirectHandled = () => (dispatch: AppDispatch) => {
  setRedirectHandledStorage()
  dispatch(internalMarkRedirectHandled())
}

export const clearRedirectHandled = () => (dispatch: AppDispatch) => {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch { }
  dispatch(internalClearRedirectHandled())
}

// Convenience thunk: perform the login and mark the redirect handled in one dispatch
export const completeLoginFromRedirect = (user: string) => (dispatch: AppDispatch) => {
  // set storage and redux flag
  setRedirectHandledStorage()
  dispatch(internalMarkRedirectHandled())

  // then mark user as logged in
  dispatch(login(user))
}

export { login, logout }
export default authSlice.reducer