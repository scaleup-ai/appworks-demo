import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import * as emailApi from '../../apis/email.api';
import {
  generateDraftStart,
  generateDraftSuccess,
  generateDraftFailure
} from '../slices/email.slice';
import { EmailDraftRequest, SagaActionWithCallback } from '../../types/api.types';

function* generateDraftSaga(action: PayloadAction<EmailDraftRequest & SagaActionWithCallback>) {
  try {
    const { onSuccess, onError, ...draftRequest } = action.payload;
    const response: Awaited<ReturnType<typeof emailApi.generateEmailDraft>> = yield call(
      emailApi.generateEmailDraft,
      draftRequest
    );

    yield put(generateDraftSuccess(response));
    onSuccess?.(response);
  } catch (error: unknown) {
    const errorPayload = {
      message: error instanceof Error ? error.message : 'Failed to generate email draft',
      status: (error as { response?: { status?: number } }).response?.status,
    };
    yield put(generateDraftFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

export function* watchEmailSagas() {
  yield takeLatest(generateDraftStart.type, generateDraftSaga);
}