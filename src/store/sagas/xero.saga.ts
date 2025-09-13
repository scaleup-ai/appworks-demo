import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import * as xeroApi from '../../apis/xero.api';
import {
  saveTokenStart,
  saveTokenSuccess,
  saveTokenFailure,
  getTokenStart,
  getTokenSuccess,
  getTokenFailure,
  startAuthStart,
  startAuthSuccess,
  startAuthFailure
} from '../slices/xero.slice';
import { XeroTokenRequest, SagaActionWithCallback } from '../../types/api.types';

function* saveTokenSaga(action: PayloadAction<XeroTokenRequest & SagaActionWithCallback>) {
  try {
    const { onSuccess, ...tokenRequest } = action.payload;
    const response: Awaited<ReturnType<typeof xeroApi.saveXeroToken>> = yield call(
      xeroApi.saveXeroToken,
      tokenRequest
    );

    yield put(saveTokenSuccess(response));
    onSuccess?.(response);
  } catch (error: unknown) {
    const errorPayload = {
      message: error instanceof Error ? error.message : 'Failed to save Xero token',
      status: (error as { response?: { status?: number } }).response?.status,
    };
    yield put(saveTokenFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

function* getTokenSaga(action: PayloadAction<{ clientId: string; tenantId: string } & SagaActionWithCallback>) {
  try {
    const { onSuccess, clientId, tenantId } = action.payload;
    const response: Awaited<ReturnType<typeof xeroApi.getXeroToken>> = yield call(
      xeroApi.getXeroToken,
      clientId,
      tenantId
    );

    yield put(getTokenSuccess(response));
    onSuccess?.(response);
  } catch (error: unknown) {
    const errorPayload = {
      message: error instanceof Error ? error.message : 'Failed to get Xero token',
      status: (error as { response?: { status?: number } }).response?.status,
    };
    yield put(getTokenFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

function* startAuthSaga(action: PayloadAction<SagaActionWithCallback>) {
  try {
    const { onSuccess } = action.payload;
    const response: Awaited<ReturnType<typeof xeroApi.startXeroAuth>> = yield call(
      xeroApi.startXeroAuth,
      'json'
    );

    yield put(startAuthSuccess(response));
    onSuccess?.(response);
  } catch (error: unknown) {
    const errorPayload = {
      message: error instanceof Error ? error.message : 'Failed to start Xero auth',
      status: (error as { response?: { status?: number } }).response?.status,
    };
    yield put(startAuthFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

export function* watchXeroSagas() {
  yield takeLatest(saveTokenStart.type, saveTokenSaga);
  yield takeLatest(getTokenStart.type, getTokenSaga);
  yield takeLatest(startAuthStart.type, startAuthSaga);
}