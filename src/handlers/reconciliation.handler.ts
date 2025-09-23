import showToast from "../utils/toast";
import { apiErrorToast } from "./shared.handler";
import { PaymentReconciliationRequest, PaymentReconciliationResponse } from "../types/api.types";

type InvoiceSummary = { invoiceId: string; number?: string; amount?: number; dueDate?: string | null; status?: string | null };

type ReconcileResult = PaymentReconciliationResponse;

type PaymentReconciliationTest = {
  id: string;
  paymentId: string;
  amount: number;
  reference?: string;
  result?: ReconcileResult | unknown;
  timestamp: string;
  status: "pending" | "completed" | "failed";
};

export function makeHandleTestPaymentReconciliation(
  testPaymentState: { paymentId: string; amount: string; reference: string },
  setTestingPayment: (b: boolean) => void,
  setReconciliationTests: (updater: (prev: PaymentReconciliationTest[]) => PaymentReconciliationTest[]) => void,
  paymentApiReconcile: (req: PaymentReconciliationRequest) => Promise<PaymentReconciliationResponse>,
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

      const result = await paymentApiReconcile(request as PaymentReconciliationRequest);

      setReconciliationTests((prev) => prev.map((test) => (test.id === newTest.id ? { ...test, result, status: "completed" } : test)));

      showToast(
        `Payment reconciliation: ${result.matched ? "Matched" : "Unmatched"}${result.invoiceId ? ` to invoice ${result.invoiceId}` : ""}`,
        { type: result.matched ? "success" : "warning" }
      );

      setTestPayment({ paymentId: "", amount: "", reference: "" });
      await loadPaymentData();
    } catch (err) {
      setReconciliationTests((prev) =>
        prev.map((test) => (test.paymentId === testPaymentState.paymentId && test.status === "pending" ? { ...test, status: "failed" } : test))
      );
      apiErrorToast(showToast, "Failed to reconcile payment")(err);
    } finally {
      setTestingPayment(false);
    }
  };
}

export function makeHandleRunBulkReconciliation(
  accountsReceivablesList: (opts?: { tenantId?: string; limit?: number }) => Promise<InvoiceSummary[]>,
  paymentApiReconcile: (req: PaymentReconciliationRequest) => Promise<PaymentReconciliationResponse>,
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
          const result = await paymentApiReconcile(payment as PaymentReconciliationRequest);
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
    } catch (err) {
      apiErrorToast(showToast, "Failed to run bulk reconciliation")(err);
    }
  };
}
