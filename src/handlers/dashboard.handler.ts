import showToast from "../utils/toast";
import { EmailDraftRequest, EmailDraftResponse, PaymentReconciliationRequest, PaymentReconciliationResponse } from "../types/api.types";

type AsyncFn<T = unknown> = () => Promise<T>;

export function makeHandleRefreshData(loadDashboardData: AsyncFn, setRefreshing: (v: boolean) => void) {
  return async function handleRefreshData() {
    setRefreshing(true);
    try {
      await loadDashboardData();
      showToast("Dashboard data refreshed", { type: "success" });
    } finally {
      setRefreshing(false);
    }
  };
}

export function makeHandleTriggerCollectionsScan(triggerScan: AsyncFn, loadDashboardData: AsyncFn) {
  return async function handleTriggerCollectionsScan() {
    try {
      await triggerScan();
      showToast("Collections scan triggered", { type: "success" });
      await loadDashboardData();
    } catch {
      showToast("Failed to trigger collections scan", { type: "error" });
    }
  };
}

export function makeHandleTestEmailGeneration(generateEmailDraft: (req: EmailDraftRequest) => Promise<EmailDraftResponse>) {
  return async function handleTestEmailGeneration() {
    try {
      const testRequest = {
        invoiceId: "test-invoice-001",
        amount: 1500,
        stage: "overdue_stage_1",
        customerName: "Test Customer Ltd",
      };
      const draft = await generateEmailDraft(testRequest);
      showToast("Email draft generated successfully", { type: "success" });
      console.log("Generated email draft:", draft);
    } catch {
      showToast("Failed to generate email draft", { type: "error" });
    }
  };
}

export function makeHandleTestPaymentReconciliation(reconcilePayment: (req: PaymentReconciliationRequest) => Promise<PaymentReconciliationResponse>) {
  return async function handleTestPaymentReconciliation() {
    try {
      const testRequest = { paymentId: "test-payment-001", amount: 1500, reference: "INV-001" };
      const result = await reconcilePayment(testRequest as PaymentReconciliationRequest);
      showToast(`Payment reconciliation: ${result.matched ? "Matched" : "Unmatched"}`, {
        type: result.matched ? "success" : "warning",
      });
    } catch {
      showToast("Failed to reconcile payment", { type: "error" });
    }
  };
}
