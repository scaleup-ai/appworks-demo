import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { AuthStorage } from "../../store/slices/auth.slice";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card.component";
import Button from "../../components/ui/Button.component";
import LoadingSpinner from "../../components/ui/LoadingSpinner.component";
import SummaryCardGrid from "../../components/ui/SummaryCardGrid.component";
import ActionBar from "../../components/ui/ActionBar.component";
import StatusBadge from "../../components/ui/StatusBadge.component";
import showToast from "../../utils/toast";
import * as accountsReceivablesApi from "../../apis/accounts-receivables.api";
import * as collectionsApi from "../../apis/collections.api";
import * as emailApi from "../../apis/email.api";
import { formatCurrency } from "../../helpers/ui.helper";
import { useApi } from "../../hooks/useApi";
import { useNavigate } from "react-router-dom";
import { ROOT_PATH } from "../../router/router";

interface Invoice {
  invoiceId: string;
  number: string;
  amount: number;
  dueDate?: string | null;
  status?: string | null;
  tenantId?: string;
  clientId?: string;
  daysPastDue?: number;
  reminderStage?: string;
}

interface CollectionsSummary {
  totalOutstanding: number;
  overdueAmount: number;
  currentAmount: number;
  scheduledReminders: number;
  sentReminders: number;
}

const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { xeroConnected, selectedOpenIdSub, selectedTenantId } = useSelector((state: RootState) => state.auth);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<CollectionsSummary>({
    totalOutstanding: 0,
    overdueAmount: 0,
    currentAmount: 0,
    scheduledReminders: 0,
    sentReminders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  const loadCollectionsData = useCallback(async () => {
    try {
      const tenantId = selectedTenantId ?? AuthStorage.getSelectedTenantId();
      const openidSub = selectedOpenIdSub ?? AuthStorage.getSelectedOpenIdSub();
      if (!tenantId && !openidSub) {
        navigate(`${ROOT_PATH}select-tenant`);
        return;
      }

      const [invoiceData, scheduledReminders] = await Promise.all([
        accountsReceivablesApi.listInvoices({ limit: 100, tenantId: tenantId || undefined }),
        collectionsApi.getScheduledReminders(),
      ]);

      const now = new Date();
      const processedInvoices = invoiceData.map((invoice) => {
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
          } else if (daysPastDue > -7) {
            reminderStage = "pre_due";
          }
        }

        return { ...invoice, daysPastDue: Math.max(0, daysPastDue), reminderStage };
      });

      const unpaidInvoices = processedInvoices.filter((inv) => inv.status !== "PAID");
      const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const overdueAmount = unpaidInvoices
        .filter((inv) => (inv.daysPastDue || 0) > 0)
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      setInvoices(processedInvoices);
      setSummary({
        totalOutstanding,
        overdueAmount,
        currentAmount: totalOutstanding - overdueAmount,
        scheduledReminders: scheduledReminders.length,
        sentReminders: 0,
      });
    } catch (error) {
      console.error("Failed to load collections data", error);
      showToast("Failed to load collections data", { type: "error" });
    }
  }, [selectedOpenIdSub, navigate]);

  const { execute: refreshData, isLoading: isRefreshing } = useApi(loadCollectionsData, {
    successMessage: "Collections data refreshed",
  });

  const { execute: triggerScan, isLoading: isScanning } = useApi(collectionsApi.triggerScan, {
    successMessage: "Collections scan triggered",
  });

  const { execute: generateEmail, isLoading: generatingEmails } = useApi(emailApi.generateEmailDraft);

  const handleTriggerScan = async () => {
    await triggerScan();
    await refreshData();
  };

  const handleGenerateEmails = async () => {
    if (selectedInvoices.size === 0) {
      showToast("Please select invoices to generate emails for", { type: "warning" });
      return;
    }

    const selectedInvoiceData = invoices.filter((inv) => selectedInvoices.has(inv.invoiceId));
    const emailPromises = selectedInvoiceData.map((invoice) =>
      generateEmail({
        invoiceId: invoice.invoiceId,
        amount: invoice.amount,
        dueDate: invoice.dueDate || undefined,
        stage: invoice.reminderStage || "overdue_stage_1",
        customerName: invoice.number || "",
      })
    );

    const results = await Promise.all(emailPromises);
    const successful = results.filter((r) => r !== undefined).length;
    const failed = results.length - successful;

    if (successful > 0) showToast(`Generated ${successful} email drafts successfully`, { type: "success" });
    if (failed > 0) showToast(`Failed to generate ${failed} email drafts`, { type: "warning" });

    setSelectedInvoices(new Set());
  };

  const handleSelectInvoice = (invoiceId: string) => {
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(invoiceId)) {
      newSelection.delete(invoiceId);
    } else {
      newSelection.add(invoiceId);
    }
    setSelectedInvoices(newSelection);
  };

  const handleSelectAll = () => {
    if (
      selectedInvoices.size === invoices.filter((inv) => inv.status !== "PAID" && (inv.daysPastDue || 0) > 0).length
    ) {
      setSelectedInvoices(new Set());
    } else {
      const overdueInvoices = invoices
        .filter((inv) => inv.status !== "PAID" && (inv.daysPastDue || 0) > 0)
        .map((inv) => inv.invoiceId);
      setSelectedInvoices(new Set(overdueInvoices));
    }
  };

  useEffect(() => {
    if (xeroConnected) {
      setLoading(true);
      refreshData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [xeroConnected, refreshData]);

  const getReminderStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      current: "Current",
      pre_due: "Pre-Due",
      overdue_stage_1: "1-30 Days",
      overdue_stage_2: "31-60 Days",
      overdue_stage_3: "60+ Days",
    };
    return labels[stage] || "Unknown";
  };

  if (!xeroConnected) {
    return (
      <DashboardLayout title="Collections">
        <div className="py-12">
          <div className="max-w-md mx-auto p-6 border rounded-lg bg-yellow-50 text-center">
            <h3 className="text-lg font-medium text-yellow-800">Xero Not Connected</h3>
            <p className="mt-2 text-sm text-yellow-700">
              Connect your Xero account to access collections and invoice data.
            </p>
            <div className="mt-4">
              <Button onClick={() => navigate(`${ROOT_PATH}auth`)}>Connect Xero</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Collections">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Collections Management"
      actions={
        <ActionBar>
          <Button onClick={() => refreshData()} loading={isRefreshing} variant="secondary" size="sm">
            Refresh
          </Button>
          <Button onClick={handleTriggerScan} loading={isScanning} size="sm">
            Trigger Scan
          </Button>
        </ActionBar>
      }
    >
      <div className="space-y-6">
        <SummaryCardGrid
          items={[
            {
              title: "Total Outstanding",
              value: formatCurrency(summary.totalOutstanding),
              className: "border-l-4 border-l-blue-500",
            },
            {
              title: "Overdue Amount",
              value: formatCurrency(summary.overdueAmount),
              className: "border-l-4 border-l-red-500",
            },
            {
              title: "Current Amount",
              value: formatCurrency(summary.currentAmount),
              className: "border-l-4 border-l-green-500",
            },
            {
              title: "Scheduled Reminders",
              value: summary.scheduledReminders,
              className: "border-l-4 border-l-purple-500",
            },
          ]}
        />

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={handleSelectAll} variant="secondary" size="sm">
                {selectedInvoices.size > 0 ? "Deselect All" : "Select Overdue"}
              </Button>
              {selectedInvoices.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedInvoices.size} invoice{selectedInvoices.size !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <Button onClick={handleGenerateEmails} loading={generatingEmails} disabled={selectedInvoices.size === 0}>
              Generate Email Reminders
            </Button>
          </div>
        </Card>

        <Card title="Outstanding Invoices" description="Invoices requiring collection attention">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Select
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Days Past Due
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices
                  .filter((invoice) => invoice.status !== "PAID")
                  .sort((a, b) => (b.daysPastDue || 0) - (a.daysPastDue || 0))
                  .map((invoice) => (
                    <tr key={invoice.invoiceId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.invoiceId)}
                          onChange={() => handleSelectInvoice(invoice.invoiceId)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.number}</div>
                        <div className="text-sm text-gray-500">{invoice.invoiceId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "No due date"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(invoice.daysPastDue || 0) > 0 ? invoice.daysPastDue : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          variant={
                            invoice.reminderStage === "current"
                              ? "green"
                              : invoice.reminderStage === "pre_due"
                                ? "blue"
                                : invoice.reminderStage === "overdue_stage_1"
                                  ? "yellow"
                                  : invoice.reminderStage === "overdue_stage_2"
                                    ? "orange"
                                    : invoice.reminderStage === "overdue_stage_3"
                                      ? "red"
                                      : "gray"
                          }
                        >
                          {getReminderStageLabel(invoice.reminderStage || "current")}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{invoice.status || "Unknown"}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {invoices.filter((inv) => inv.status !== "PAID").length === 0 && (
              <div className="py-8 text-center text-gray-500">No outstanding invoices found</div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CollectionsPage;
