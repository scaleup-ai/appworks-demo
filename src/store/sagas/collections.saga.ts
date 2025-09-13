import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import * as collectionsApi from '../../apis/collections.api';
import {
  startCollectionsStart,
  startCollectionsSuccess,
  startCollectionsFailure,
  stopCollectionsStart,
  stopCollectionsSuccess,
  stopCollectionsFailure,
  triggerScanStart,
  triggerScanSuccess,
  triggerScanFailure,
  getScheduledStart,
  getScheduledSuccess,
  getScheduledFailure
} from '../slices/collections.slice';
import { SagaActionWithCallback } from '../../types/api.types';

function* startCollectionsSaga(action: PayloadAction<SagaActionWithCallback>) {
  try {
    const { onSuccess, onError } = action.payload;
    const response: Awaited<ReturnType<typeof collectionsApi.startCollections>> = yield call(
      collectionsApi.startCollections
    );

    yield put(startCollectionsSuccess());
    onSuccess?.(response);
  } catch (error: unknown) {
    const errorPayload = {
      message: error instanceof Error ? error.message : 'Failed to start collections',
      status: (error as { response?: { status?: number } }).response?.status,
    };
    yield put(startCollectionsFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

function* stopCollectionsSaga(action: PayloadAction<SagaActionWithCallback>) {
  try {
    const { onSuccess, onError } = action.payload;
    const response: Awaited<ReturnType<typeof collectionsApi.stopCollections>> = yield call(
      collectionsApi.stopCollections
    );

    yield put(stopCollectionsSuccess());
    onSuccess?.(response);
  } catch (error: unknown) {
    const errorPayload = {
      message: error instanceof Error ? error.message : 'Failed to stop collections',
      status: (error as { response?: { status?: number } }).response?.status,
    };
    yield put(stopCollectionsFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

function* triggerScanSaga(action: PayloadAction<SagaActionWithCallback>) {
  try {
    const { onSuccess, onError } = action.payload;
    const response: Awaited<ReturnType<typeof collectionsApi.triggerScan>> = yield call(
      collectionsApi.triggerScan
    );

    yield put(triggerScanSuccess());
    onSuccess?.(response);
  } catch (error: unknown) {
    const errorPayload = {
      message: error instanceof Error ? error.message : 'Failed to trigger scan',
      status: (error as { response?: { status?: number } }).response?.status,
    };
    yield put(triggerScanFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

function* getScheduledSaga(action: PayloadAction<SagaActionWithCallback>) {
  try {
    const { onSuccess, onError } = action.payload;
    const response: Awaited<ReturnType<typeof collectionsApi.getScheduledReminders>> = yield call(
      collectionsApi.getScheduledReminders
    );

    yield put(getScheduledSuccess(response));
    onSuccess?.(response);
  } catch (error: unknown) {
    const errorPayload = {
      message: error instanceof Error ? error.message : 'Failed to get scheduled reminders',
      status: (error as { response?: { status?: number } }).response?.status,
    };
    yield put(getScheduledFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

export function* watchCollectionsSagas() {
  yield takeLatest(startCollectionsStart.type, startCollectionsSaga);
  yield takeLatest(stopCollectionsStart.type, stopCollectionsSaga);
  yield takeLatest(triggerScanStart.type, triggerScanSaga);
  yield takeLatest(getScheduledStart.type, getScheduledSaga);
}