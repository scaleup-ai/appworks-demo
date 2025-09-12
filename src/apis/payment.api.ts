import axiosClient from './axios-client';
import { PaymentReconciliationRequest, PaymentReconciliationResponse } from '../types/api.types';

export enum PaymentApiRoutes {
  // Deprecated: payment-reconciliation endpoints were removed in the OpenAPI update.
  BASE = '/api/v1/payment-reconciliation',
  PAYMENTS_RECONCILE = '/api/v1/payment-reconciliation/payments/reconcile',
}

export async function reconcilePayment(request: PaymentReconciliationRequest): Promise<PaymentReconciliationResponse> {
  throw new Error('reconcilePayment: endpoint removed in OpenAPI update; payment reconciliation is handled elsewhere')
}

export default {
  reconcilePayment,
};