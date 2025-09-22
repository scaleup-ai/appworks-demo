import type { PaymentReconciliationTest, PaymentSummary } from '../types/handlers.types';
import type { ToastOptions } from 'react-toastify';
import * as paymentApi from "../apis/payment.api";
import * as accountsReceivablesApi from "../apis/accounts-receivables.api";
import showToast from "../utils/toast";

export async function loadPaymentData(
  setReconciliationTests: (tests: PaymentReconciliationTest[]) => void,
  setSummary: (summary: PaymentSummary) => void,
  setLoading: (loading: boolean) => void
) {
  try {
    setLoading(true);
    const history: PaymentReconciliationTest[] = [];
    setReconciliationTests([]);
    const completed = history.filter((t: PaymentReconciliationTest) => t.status === "completed");
    const matched = completed.filter((t: PaymentReconciliationTest) => t.result?.matched);
    const unmatched = completed.filter((t: PaymentReconciliationTest) => t.result && !t.result.matched);
    const totalAmount = completed.reduce((sum: number, t: PaymentReconciliationTest) => sum + t.amount, 0);
    setSummary({
      totalProcessed: completed.length,
      matchedPayments: matched.length,
      unmatchedPayments: unmatched.length,
      totalAmount,
    });
  } catch {
    showToast("Failed to load payment data", { type: "error" });
  } finally {
    setLoading(false);
  }
}

export async function handleTestPaymentReconciliation(
  testPayment: { paymentId: string; amount: string; reference: string },
  setTestingPayment: (testing: boolean) => void,
  setReconciliationTests: (tests: PaymentReconciliationTest[] | ((prev: PaymentReconciliationTest[]) => PaymentReconciliationTest[])) => void,
  setTestPayment: (payment: { paymentId: string; amount: string; reference: string }) => void,
  loadPaymentData: () => Promise<void>
) {
  if (!testPayment.paymentId || !testPayment.amount) {
    showToast("Please fill in payment ID and amount", { type: "warning" });
    return;
  }
  setTestingPayment(true);
  try {
    const request = {
      paymentId: testPayment.paymentId,
      amount: parseFloat(testPayment.amount),
      reference: testPayment.reference || undefined,
    };
    const newTest: PaymentReconciliationTest = {
      id: Date.now().toString(),
      ...request,
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    setReconciliationTests((prev: PaymentReconciliationTest[]) => [newTest, ...prev]);
    const result = await paymentApi.reconcilePayment(request);
    setReconciliationTests((prev: PaymentReconciliationTest[]) =>
      prev.map((test: PaymentReconciliationTest) => (test.id === newTest.id ? { ...test, result, status: "completed" } : test))
    );
    showToast(
      `Payment reconciliation: ${result.matched ? "Matched" : "Unmatched"}${result.invoiceId ? ` to invoice ${result.invoiceId}` : ""
      }`,
      { type: result.matched ? "success" : "warning" }
    );
    setTestPayment({ paymentId: "", amount: "", reference: "" });
    await loadPaymentData();
  } catch {
    setReconciliationTests((prev: PaymentReconciliationTest[]) =>
      prev.map((test: PaymentReconciliationTest) =>
        test.paymentId === testPayment.paymentId && test.status === "pending"
          ? { ...test, status: "failed" }
          : test
      )
    );
    showToast("Failed to reconcile payment", { type: "error" });
  } finally {
    setTestingPayment(false);
  }
}

export async function handleRunBulkReconciliation(
  selectedTenantId: string | null,
  setReconciliationTests: (tests: PaymentReconciliationTest[] | ((prev: PaymentReconciliationTest[]) => PaymentReconciliationTest[])) => void,
  showToast: (msg: string, opts?: ToastOptions) => void,
  loadPaymentData: () => Promise<void>
) {
  try {
    const tenantId = selectedTenantId;
    const invoices = await accountsReceivablesApi.listInvoices({ limit: 5, tenantId: tenantId || undefined });
    if (invoices.length === 0) {
      showToast("No invoices available for bulk reconciliation test", { type: "warning" });
      return;
    }
    showToast("Starting bulk reconciliation test...", { type: "info" });
    const testPayments = invoices.slice(0, 3).map((invoice, index) => ({
      paymentId: `BULK-PAY-${Date.now()}-${index}`,
      amount: invoice.amount,
      reference: invoice.number,
    }));
    for (const payment of testPayments) {
      try {
        const result = await paymentApi.reconcilePayment(payment);
        const newTest: PaymentReconciliationTest = {
          id: `${payment.paymentId}-${Date.now()}`,
          ...payment,
          result,
          timestamp: new Date().toISOString(),
          status: "completed",
        };
        setReconciliationTests((prev: PaymentReconciliationTest[]) => [newTest, ...prev]);
      } catch {
        // Optionally handle error
      }
    }
    showToast(`Bulk reconciliation completed for ${testPayments.length} payments`, { type: "success" });
    await loadPaymentData();
  } catch {
    showToast("Failed to run bulk reconciliation", { type: "error" });
  }
}
