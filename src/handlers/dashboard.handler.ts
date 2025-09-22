import * as accountsReceivablesApi from "../apis/accounts-receivables.api";
import * as emailApi from "../apis/email.api";
import * as paymentApi from "../apis/payment.api";
import { useCollectionsStore } from "../store/collections.store";
import showToast from "../utils/toast";
import { EmailDraftRequest, PaymentReconciliationRequest } from "../types/api.types";
import { InvoiceSummaryDTO } from "../apis/accounts-receivables.api";
import { AgentStatus } from "../apis/agents.api";

export async function initializeAgents(setAgents: (agents: AgentStatus[]) => void) {
  try {
    const agentList = await import("../apis/agents.api").then((m) => m.listAgents());
    setAgents(agentList);
  } catch {
    setAgents([]);
    showToast("Failed to load agent status", { type: "error" });
  }
}

interface DashboardStats {
  totalInvoices: number;
  outstandingAmount: number;
  overdueAmount: number;
  collectedThisMonth: number;
  scheduledReminders: number;
  unmatchedPayments: number;
}

export async function loadDashboardData(selectedTenantId: string | null, setStats: (stats: DashboardStats) => void, setLoading: (loading: boolean) => void) {
  try {
    setLoading(true);
    const tenantId = selectedTenantId;
    const invoices: InvoiceSummaryDTO[] = await accountsReceivablesApi.listInvoices({ limit: 100, tenantId: tenantId || undefined });
    let scheduledReminders: Array<{ id: string }> = [];
    await new Promise<void>((resolve, reject) => {
      useCollectionsStore.getState().getScheduledReminders(
        (res: Array<{ id: string }>) => {
          scheduledReminders = res;
          resolve();
        },
        (err: { message: string }) => {
          scheduledReminders = [];
          reject(err);
        }
      );
    });
    const totalInvoices = invoices.length;
    const outstandingAmount = invoices
      .filter((inv: InvoiceSummaryDTO) => inv.status !== "PAID")
      .reduce((sum: number, inv: InvoiceSummaryDTO) => sum + (inv.amount || 0), 0);
    const now = new Date();
    const overdueAmount = invoices
      .filter((inv: InvoiceSummaryDTO) => {
        if (inv.status === "PAID" || !inv.dueDate) return false;
        return new Date(inv.dueDate) < now;
      })
      .reduce((sum: number, inv: InvoiceSummaryDTO) => sum + (inv.amount || 0), 0);
    setStats({
      totalInvoices,
      outstandingAmount,
      overdueAmount,
      collectedThisMonth: 0,
      scheduledReminders: scheduledReminders.length,
      unmatchedPayments: 0,
    });
  } catch {
    showToast("Failed to load dashboard data", { type: "error" });
  } finally {
    setLoading(false);
  }
}

export async function handleTriggerCollectionsScan(loadDashboardData: () => Promise<void>) {
  try {
    await useCollectionsStore.getState().triggerScan(
      () => {
        showToast("Collections scan triggered", { type: "success" });
      },
      () => {
        showToast("Failed to trigger collections scan", { type: "error" });
      }
    );
    await loadDashboardData();
  } catch {
    showToast("Failed to trigger collections scan", { type: "error" });
  }
}

export async function handleTestEmailGeneration() {
  try {
    const testRequest: EmailDraftRequest = {
      invoiceId: "test-invoice-001",
      amount: 1500,
      stage: "overdue_stage_1",
      customerName: "Test Customer Ltd",
    };
    const draft = await emailApi.generateEmailDraft(testRequest);
    showToast("Email draft generated successfully", { type: "success" });
    console.log("Generated email draft:", draft);
  } catch {
    showToast("Failed to generate email draft", { type: "error" });
  }
}

export async function handleTestPaymentReconciliation() {
  try {
    const testRequest: PaymentReconciliationRequest = {
      paymentId: "test-payment-001",
      amount: 1500,
      reference: "INV-001",
    };
    const result = await paymentApi.reconcilePayment(testRequest);
    showToast(`Payment reconciliation: ${result.matched ? "Matched" : "Unmatched"}`,
      { type: result.matched ? "success" : "warning" });
  } catch {
    showToast("Failed to reconcile payment", { type: "error" });
  }
}
