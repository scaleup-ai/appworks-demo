import axiosClient from './axios-client';
import { PaymentReconciliationRequest, PaymentReconciliationResponse } from '../types/api.types';

export async function reconcilePayment(request: PaymentReconciliationRequest): Promise<PaymentReconciliationResponse> {
  const response = await axiosClient.post<PaymentReconciliationResponse>('/api/v1/payments/reconcile', request);
  return response.data;
}

export default {
  reconcilePayment,
};