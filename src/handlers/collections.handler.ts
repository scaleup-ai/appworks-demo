import showToast from "../utils/toast";
import { withLoading, apiErrorToast } from "./shared.handler";
import { EmailDraftRequest, EmailDraftResponse } from "../types/api.types";

type InvoiceView = { invoiceId: string; number?: string; amount: number; dueDate?: string | null; status?: string | null; reminderStage?: string };

export function makeHandleTriggerScan(triggerScan: () => Promise<unknown>, loadCollectionsData: () => Promise<unknown>) {
  return async function handleTriggerScan() {
    try {
      await triggerScan();
      showToast("Collections scan triggered successfully", { type: "success" });
      await loadCollectionsData();
    } catch {
      showToast("Failed to trigger collections scan", { type: "error" });
    }
  };
}

export function makeHandleGenerateEmails(
  selectedInvoices: Set<string>,
  invoices: InvoiceView[],
  emailApiGenerate: (req: EmailDraftRequest) => Promise<EmailDraftResponse>,
  setSelectedInvoices: (s: Set<string>) => void,
  setGenerating: (b: boolean) => void
) {
  return async function handleGenerateEmails() {
    if (selectedInvoices.size === 0) {
      showToast("Please select invoices to generate emails for", { type: "warning" });
      return;
    }
    await withLoading(setGenerating, async () => {
      const handleError = apiErrorToast(showToast, "Failed to generate email drafts");
      try {
        const selectedInvoiceData = invoices.filter((inv) => inv.invoiceId && selectedInvoices.has(inv.invoiceId));
        const emailPromises = selectedInvoiceData.map(async (invoice) => {
          try {
            const draft = await emailApiGenerate({
              invoiceId: invoice.invoiceId,
              amount: invoice.amount,
              dueDate: invoice.dueDate || undefined,
              stage: invoice.reminderStage || "overdue_stage_1",
              customerName: invoice.number || "",
            });
            return { invoice, draft, success: true };
          } catch (error) {
            return { invoice, error, success: false };
          }
        });

        const results = await Promise.all(emailPromises);
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        if (successful > 0) showToast(`Generated ${successful} email drafts successfully`, { type: "success" });
        if (failed > 0) showToast(`Failed to generate ${failed} email drafts`, { type: "warning" });

        setSelectedInvoices(new Set());
      } catch (err) {
        console.error("Failed to generate email drafts:", err);
        handleError(err);
      }
    });
  };
}

export function makeHandleSelectInvoice(selectedInvoices: Set<string>, setSelectedInvoices: (s: Set<string>) => void) {
  return function handleSelectInvoice(invoiceId: string) {
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(invoiceId)) newSelection.delete(invoiceId);
    else newSelection.add(invoiceId);
    setSelectedInvoices(newSelection);
  };
}

export function makeHandleSelectAll<InvoiceT extends { invoiceId: string; status?: string | null; daysPastDue?: number }>(
  invoices: InvoiceT[],
  selectedInvoices: Set<string>,
  setSelectedInvoices: (s: Set<string>) => void
) {
  return function handleSelectAll() {
    const overdueInvoices = invoices.filter((inv) => {
      const i = inv as Record<string, unknown>;
      const status = (i.status as string | null | undefined) ?? null;
      const daysPastDue = (i.daysPastDue as number | undefined) || 0;
      return status !== "PAID" && daysPastDue > 0;
    });
    if (selectedInvoices.size === overdueInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(overdueInvoices.map((inv) => (inv as Record<string, unknown>).invoiceId as string)));
    }
  };
}
