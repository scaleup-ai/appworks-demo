import showToast from "../utils/toast";
import { EmailDraftRequest, EmailDraftResponse, PaymentReconciliationRequest, PaymentReconciliationResponse } from "../types/api.types";
import { withLoading, apiErrorToast } from "./shared.handler";

type AsyncFn<T = unknown> = () => Promise<T>;

export function makeHandleRefreshData(loadDashboardData: AsyncFn, setRefreshing: (v: boolean) => void) {
  return async function handleRefreshData() {
    await withLoading(setRefreshing, async () => {
      const handleError = apiErrorToast(showToast, "Failed to refresh dashboard data");
      try {
        await loadDashboardData();
        showToast("Dashboard data refreshed", { type: "success" });
      } catch (err) {
        handleError(err);
      }
    });
  };
}

export function makeHandleTriggerCollectionsScan(triggerScan: AsyncFn, loadDashboardData: AsyncFn) {
  return async function handleTriggerCollectionsScan() {
    const handleError = apiErrorToast(showToast, "Failed to trigger collections scan");
    try {
      await triggerScan();
      showToast("Collections scan triggered", { type: "success" });
      await loadDashboardData();
    } catch (err) {
      handleError(err);
    }
  };
}

export function makeHandleTestEmailGeneration(generateEmailDraft: (req: EmailDraftRequest) => Promise<EmailDraftResponse>) {
  return async function handleTestEmailGeneration() {
    const handleError = apiErrorToast(showToast, "Failed to generate email draft");
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
    } catch (err) {
      handleError(err);
    }
  };
}

export function makeHandleTestPaymentReconciliation(reconcilePayment: (req: PaymentReconciliationRequest) => Promise<PaymentReconciliationResponse>) {
  return async function handleTestPaymentReconciliation() {
    const handleError = apiErrorToast(showToast, "Failed to reconcile payment");
    try {
      const testRequest = { paymentId: "test-payment-001", amount: 1500, reference: "INV-001" };
      const result = await reconcilePayment(testRequest as PaymentReconciliationRequest);
      showToast(`Payment reconciliation: ${result.matched ? "Matched" : "Unmatched"}`, {
        type: result.matched ? "success" : "warning",
      });
    } catch (err) {
      handleError(err);
    }
  };
}
