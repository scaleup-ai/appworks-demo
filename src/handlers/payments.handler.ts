import showToast from "../utils/toast";

type ReconcileResult = { matched?: boolean; invoiceId?: string };

type PaymentReconciliationTest = {
  id: string;
  paymentId: string;
  amount: number;
  reference?: string;
  result?: ReconcileResult | unknown;
  timestamp: string;
  status: "pending" | "completed" | "failed";
};

export function makeHandleTestPaymentReconciliation<Req = unknown, Res = unknown>(
  testPaymentState: { paymentId: string; amount: string; reference: string },
  setTestingPayment: (b: boolean) => void,
  setReconciliationTests: (updater: (prev: PaymentReconciliationTest[]) => PaymentReconciliationTest[]) => void,
  paymentApiReconcile: (req: Req) => Promise<Res>,
  loadPaymentData: () => Promise<unknown>,
  setTestPayment: (s: { paymentId: string; amount: string; reference: string }) => void
) {
  return async function handleTestPaymentReconciliation() {
    if (!testPaymentState.paymentId || !testPaymentState.amount) {
      showToast("Please fill in payment ID and amount", { type: "warning" });
      return;
    }

    setTestingPayment(true);
    try {
      const request = {
        paymentId: testPaymentState.paymentId,
        amount: parseFloat(testPaymentState.amount),
        reference: testPaymentState.reference || undefined,
      };

      const newTest: PaymentReconciliationTest = {
        id: Date.now().toString(),
        paymentId: request.paymentId,
        amount: request.amount,
        reference: request.reference as string | undefined,
        timestamp: new Date().toISOString(),
        status: "pending",
      };

      setReconciliationTests((prev) => [newTest, ...prev]);

      const resultRaw = await paymentApiReconcile(request as unknown as Req);
      const result = (resultRaw as ReconcileResult) || {};

      setReconciliationTests((prev) => prev.map((test) => (test.id === newTest.id ? { ...test, result, status: "completed" } : test)));

      showToast(
        `Payment reconciliation: ${result.matched ? "Matched" : "Unmatched"}${result.invoiceId ? ` to invoice ${result.invoiceId}` : ""}`,
        { type: result.matched ? "success" : "warning" }
      );

      setTestPayment({ paymentId: "", amount: "", reference: "" });
      await loadPaymentData();
    } catch {
      setReconciliationTests((prev) =>
        prev.map((test) => (test.paymentId === testPaymentState.paymentId && test.status === "pending" ? { ...test, status: "failed" } : test))
      );
      showToast("Failed to reconcile payment", { type: "error" });
    } finally {
      setTestingPayment(false);
    }
  };
}

export function makeHandleRunBulkReconciliation<Req = unknown, Res = unknown>(
  accountsReceivablesList: (opts?: Record<string, unknown>) => Promise<unknown[]>,
  paymentApiReconcile: (req: Req) => Promise<Res>,
  selectedTenantIdGetter: () => string | null,
  setReconciliationTests: (updater: (prev: PaymentReconciliationTest[]) => PaymentReconciliationTest[]) => void,
  loadPaymentData: () => Promise<unknown>
) {
  return async function handleRunBulkReconciliation() {
    try {
      const tenantId = selectedTenantIdGetter() || localStorage.getItem("selectedTenantId") || null;
      const invoices = await accountsReceivablesList({ limit: 5, tenantId: tenantId || undefined });

      if (invoices.length === 0) {
        showToast("No invoices available for bulk reconciliation test", { type: "warning" });
        return;
      }

      showToast("Starting bulk reconciliation test...", { type: "info" });

      const testPayments = invoices.slice(0, 3).map((invoice: unknown, index: number) => {
        const inv = invoice as Record<string, unknown>;
        const amountVal = inv["amount"] as number | undefined;
        const referenceVal = inv["number"] as string | undefined;
        return {
          paymentId: `BULK-PAY-${Date.now()}-${index}`,
          amount: typeof amountVal === "number" ? amountVal : Number(amountVal || 0),
          reference: referenceVal || String(Date.now()),
        };
      });

      for (const payment of testPayments) {
        try {
          const result = await paymentApiReconcile(payment as unknown as Req);
          const newTest: PaymentReconciliationTest = {
            id: `${payment.paymentId}-${Date.now()}`,
            paymentId: payment.paymentId,
            amount: payment.amount,
            reference: payment.reference as string | undefined,
            result: result as ReconcileResult | unknown,
            timestamp: new Date().toISOString(),
            status: "completed",
          };
          setReconciliationTests((prev) => [newTest, ...prev]);
        } catch (error) {
          console.error(`Failed to reconcile payment ${payment.paymentId}:`, error);
        }
      }

      showToast(`Bulk reconciliation completed for ${testPayments.length} payments`, { type: "success" });
      await loadPaymentData();
    } catch {
      showToast("Failed to run bulk reconciliation", { type: "error" });
    }
  };
}
