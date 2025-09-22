import showToast from "../utils/toast";

export function makeHandleTriggerScan(triggerScan: () => Promise<any>, loadCollectionsData: () => Promise<any>) {
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

export function makeHandleGenerateEmails<Req = unknown, Res = unknown>(
  selectedInvoices: Set<string>,
  invoices: Array<Record<string, any>>,
  emailApiGenerate: (req: Req) => Promise<Res>,
  setSelectedInvoices: (s: Set<string>) => void,
  setGenerating: (b: boolean) => void
) {
  return async function handleGenerateEmails() {
    if (selectedInvoices.size === 0) {
      showToast("Please select invoices to generate emails for", { type: "warning" });
      return;
    }

    setGenerating(true);
    try {
      const selectedInvoiceData = invoices.filter((inv) => selectedInvoices.has(inv.invoiceId));
      const emailPromises = selectedInvoiceData.map(async (invoice) => {
        try {
          const draft = await emailApiGenerate({
            invoiceId: invoice.invoiceId,
            amount: invoice.amount,
            dueDate: invoice.dueDate || undefined,
            stage: invoice.reminderStage || "overdue_stage_1",
            customerName: `Customer for ${invoice.number}`,
          } as unknown as Req);
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
    } catch (error) {
      console.error("Failed to generate email drafts:", error);
      showToast("Failed to generate email drafts", { type: "error" });
    } finally {
      setGenerating(false);
    }
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

export function makeHandleSelectAll(invoices: Array<Record<string, any>>, selectedInvoices: Set<string>, setSelectedInvoices: (s: Set<string>) => void) {
  return function handleSelectAll() {
    const overdueInvoices = invoices.filter((inv) => inv.status !== "PAID" && (inv.daysPastDue || 0) > 0);
    if (selectedInvoices.size === overdueInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(overdueInvoices.map((inv) => inv.invoiceId)));
    }
  };
}
