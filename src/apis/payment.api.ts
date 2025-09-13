import axiosClient from './axios-client';
import { PaymentReconciliationRequest, PaymentReconciliationResponse } from '../types/api.types';

export enum PaymentApiRoutes {
  BASE = '/api/v1/payment-reconciliation',
  PAYMENTS_RECONCILE = '/api/v1/payment-reconciliation/payments/reconcile',
}

export async function reconcilePayment(request: PaymentReconciliationRequest): Promise<PaymentReconciliationResponse> {
  const response = await axiosClient.post(PaymentApiRoutes.PAYMENTS_RECONCILE, request);
  return response.data;
}

export default {
  reconcilePayment,
};