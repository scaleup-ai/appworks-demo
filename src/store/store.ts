import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import authReducer from './authSlice'
import xeroReducer from './slices/xero.slice'
import collectionsReducer from './slices/collections.slice'
import emailReducer from './slices/email.slice'
import paymentReducer from './slices/payment.slice'
import rootSaga from './sagas'

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
  reducer: {
    auth: authReducer,
    xero: xeroReducer,
    collections: collectionsReducer,
    email: emailReducer,
    payment: paymentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: false, // Disable thunk since we're using saga
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(sagaMiddleware),
})

sagaMiddleware.run(rootSaga)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch