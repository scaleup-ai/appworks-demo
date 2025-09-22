import type { Invoice, CollectionsSummary } from '../types/handlers.types';
import * as accountsReceivablesApi from "../apis/accounts-receivables.api";
import * as emailApi from "../apis/email.api";
import showToast from "../utils/toast";
import { useCollectionsStore } from "../store/collections.store";

export async function loadCollectionsData(
  selectedTenantId: string | null,
  setInvoices: (invoices: Invoice[]) => void,
  setSummary: (summary: CollectionsSummary) => void,
  setLoading: (loading: boolean) => void
) {
  try {
    setLoading(true);
    const tenantId = selectedTenantId;
    const invoiceData = await accountsReceivablesApi.listInvoices({ limit: 100, tenantId: tenantId || undefined });
    let scheduledReminders: unknown[] = [];
    await new Promise<void>((resolve, reject) => {
      useCollectionsStore.getState().getScheduledReminders(
        (res: unknown[]) => {
          scheduledReminders = res;
          resolve();
        },
        (err: unknown) => {
          scheduledReminders = [];
          reject(err);
        }
      );
    });
    const now = new Date();
    const processedInvoices = invoiceData.map((invoice: Invoice) => {
      let daysPastDue = 0;
      let reminderStage = "current";
      if (invoice.dueDate && invoice.status !== "PAID") {
        const dueDate = new Date(invoice.dueDate);
        const diffTime = now.getTime() - dueDate.getTime();
        daysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (daysPastDue > 0) {
          if (daysPastDue <= 30) reminderStage = "overdue_stage_1";
          else if (daysPastDue <= 60) reminderStage = "overdue_stage_2";
          else reminderStage = "overdue_stage_3";
        } else if (daysPastDue > -7) reminderStage = "pre_due";
      }
      return { ...invoice, daysPastDue: Math.max(0, daysPastDue), reminderStage };
    });
    const unpaidInvoices = processedInvoices.filter((inv: Invoice) => inv.status !== "PAID");
    const totalOutstanding = unpaidInvoices.reduce((sum: number, inv: Invoice) => sum + (inv.amount || 0), 0);
    const overdueAmount = unpaidInvoices.filter((inv: Invoice) => (inv.daysPastDue || 0) > 0).reduce((sum: number, inv: Invoice) => sum + (inv.amount || 0), 0);
    const currentAmount = totalOutstanding - overdueAmount;
    setInvoices(processedInvoices);
    setSummary({
      totalOutstanding,
      overdueAmount,
      currentAmount,
      scheduledReminders: scheduledReminders.length,
      sentReminders: 0,
    });
  } catch {
    showToast("Failed to load collections data", { type: "error" });
  } finally {
    setLoading(false);
  }
}

export async function handleTriggerScan(loadCollectionsData: () => void) {
  try {
    await useCollectionsStore.getState().triggerScan(
      () => {
        showToast("Collections scan triggered successfully", { type: "success" });
      },
      () => {
        showToast("Failed to trigger collections scan", { type: "error" });
      }
    );
    await loadCollectionsData();
  } catch {
    showToast("Failed to trigger collections scan", { type: "error" });
  }
}

export async function handleGenerateEmails(
  selectedInvoices: Set<string>,
  invoices: Invoice[],
  setGeneratingEmails: (generating: boolean) => void
) {
  if (selectedInvoices.size === 0) {
    showToast("Please select invoices to generate emails for", { type: "warning" });
    return;
  }
  setGeneratingEmails(true);
  try {
    const selectedInvoiceData = invoices.filter((inv: Invoice) => selectedInvoices.has(inv.invoiceId));
    const emailPromises = selectedInvoiceData.map(async (invoice: Invoice) => {
      try {
        await emailApi.generateEmailDraft({
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          dueDate: invoice.dueDate || undefined,
          stage: invoice.reminderStage || "overdue_stage_1",
          customerName: `Customer for ${invoice.number}`,
        });
        // Optionally handle draft (e.g., preview, send)
      } catch {
        // Optionally handle error
      }
    });
    await Promise.all(emailPromises);
    showToast("Email drafts generated for selected invoices", { type: "success" });
  } catch {
    showToast("Failed to generate email drafts", { type: "error" });
  } finally {
    setGeneratingEmails(false);
  }
}
