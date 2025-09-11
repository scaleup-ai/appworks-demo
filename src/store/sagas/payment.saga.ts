import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import * as paymentApi from '../../apis/payment.api';
import {
  reconcilePaymentStart,
  reconcilePaymentSuccess,
  reconcilePaymentFailure
} from '../slices/payment.slice';
import { PaymentReconciliationRequest, SagaActionWithCallback } from '../../types/api.types';

function* reconcilePaymentSaga(action: PayloadAction<PaymentReconciliationRequest & SagaActionWithCallback>) {
  try {
    const { onSuccess, onError, ...reconciliationRequest } = action.payload;
    const response: Awaited<ReturnType<typeof paymentApi.reconcilePayment>> = yield call(
      paymentApi.reconcilePayment,
      reconciliationRequest
    );
    
    yield put(reconcilePaymentSuccess(response));
    onSuccess?.(response);
  } catch (error: any) {
    const errorPayload = {
      message: error.message || 'Failed to reconcile payment',
      status: error.response?.status,
    };
    yield put(reconcilePaymentFailure(errorPayload));
    action.payload.onError?.(errorPayload);
  }
}

export function* watchPaymentSagas() {
  yield takeLatest(reconcilePaymentStart.type, reconcilePaymentSaga);
}