import showToast from "../utils/toast";

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

export function makeHandleTestEmailGeneration<Req = unknown, Res = unknown>(generateEmailDraft: (req: Req) => Promise<Res>) {
  return async function handleTestEmailGeneration() {
    try {
      const testRequest = {
        invoiceId: "test-invoice-001",
        amount: 1500,
        stage: "overdue_stage_1",
        customerName: "Test Customer Ltd",
      };
      const draft = await generateEmailDraft(testRequest as unknown as Req);
      showToast("Email draft generated successfully", { type: "success" });
      console.log("Generated email draft:", draft);
    } catch {
      showToast("Failed to generate email draft", { type: "error" });
    }
  };
}

type ReconcileResult = { matched?: boolean; invoiceId?: string };

export function makeHandleTestPaymentReconciliation<Req = unknown, Res = unknown>(reconcilePayment: (req: Req) => Promise<Res>) {
  return async function handleTestPaymentReconciliation() {
    try {
      const testRequest = { paymentId: "test-payment-001", amount: 1500, reference: "INV-001" };
      const resultRaw = await reconcilePayment(testRequest as unknown as Req);
      const result = (resultRaw as ReconcileResult) || {};
      showToast(`Payment reconciliation: ${result.matched ? "Matched" : "Unmatched"}`, {
        type: result.matched ? "success" : "warning",
      });
    } catch {
      showToast("Failed to reconcile payment", { type: "error" });
    }
  };
}
