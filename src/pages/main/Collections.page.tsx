import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { AuthStorage } from "../../store/slices/auth.slice";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card.component";
import Button from "../../components/ui/Button.component";
import LoadingSpinner from "../../components/ui/LoadingSpinner.component";
import TenantPrompt from "../../components/ui/TenantPrompt.component";
import SummaryCardGrid from "../../components/ui/SummaryCardGrid.component";
import ActionBar from "../../components/ui/ActionBar.component";
import StatusBadge from "../../components/ui/StatusBadge.component";
import showToast from "../../utils/toast";
import * as accountsReceivablesApi from "../../apis/accounts-receivables.api";
import * as collectionsApi from "../../apis/collections.api";
import {
  makeHandleTriggerScan,
  makeHandleGenerateEmails,
  makeHandleSelectInvoice,
  makeHandleSelectAll,
} from "../../handlers/collections.handler";
import * as emailApi from "../../apis/email.api";
import { formatCurrency } from "../../helpers/ui.helper";

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
  const { xeroConnected, selectedOpenIdSub } = useSelector((state: RootState) => state.auth);
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
  const [generatingEmails, setGeneratingEmails] = useState(false);

  const loadCollectionsData = async () => {
    try {
      setLoading(true);

      // Load invoices scoped to selected tenant (Redux primary, safe localStorage fallback)
      const openid_sub = selectedOpenIdSub ?? AuthStorage.getSelectedTenantId();
      const invoiceData = await accountsReceivablesApi.listInvoices({ limit: 100, tenantId: openid_sub || undefined });

      // Load scheduled reminders
      const scheduledReminders = await collectionsApi.getScheduledReminders();

      // Process invoices and calculate aging
      const now = new Date();
      const processedInvoices = invoiceData.map((invoice) => {
        let daysPastDue = 0;
        let reminderStage = "current";

        if (invoice.dueDate && invoice.status !== "PAID") {
          const dueDate = new Date(invoice.dueDate);
          const diffTime = now.getTime() - dueDate.getTime();
          daysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (daysPastDue > 0) {
            if (daysPastDue <= 30) {
              reminderStage = "overdue_stage_1";
            } else if (daysPastDue <= 60) {
              reminderStage = "overdue_stage_2";
            } else {
              reminderStage = "overdue_stage_3";
            }
          } else if (daysPastDue > -7) {
            reminderStage = "pre_due";
          }
        }

        return {
          ...invoice,
          daysPastDue: Math.max(0, daysPastDue),
          reminderStage,
        };
      });

      // Calculate summary
      const unpaidInvoices = processedInvoices.filter((inv) => inv.status !== "PAID");
      const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const overdueAmount = unpaidInvoices
        .filter((inv) => (inv.daysPastDue || 0) > 0)
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const currentAmount = totalOutstanding - overdueAmount;

      setInvoices(processedInvoices);
      setSummary({
        totalOutstanding,
        overdueAmount,
        currentAmount,
        scheduledReminders: scheduledReminders.length,
        sentReminders: 0, // Would need to track this from event history
      });
    } catch {
      console.error("Failed to load collections data");
      showToast("Failed to load collections data", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScan = makeHandleTriggerScan(collectionsApi.triggerScan, loadCollectionsData);
  const handleGenerateEmails = makeHandleGenerateEmails(
    selectedInvoices,
    invoices,
    emailApi.generateEmailDraft,
    setSelectedInvoices,
    setGeneratingEmails
  );
  const handleSelectInvoice = makeHandleSelectInvoice(selectedInvoices, setSelectedInvoices);
  const handleSelectAll = makeHandleSelectAll(invoices, selectedInvoices, setSelectedInvoices);

  useEffect(() => {
    if (xeroConnected) {
      const openid_sub = selectedOpenIdSub ?? AuthStorage.getSelectedTenantId();
      if (!openid_sub) {
        window.location.href = "/select-tenant";
        return;
      }
      loadCollectionsData();
    } else {
      setLoading(false);
    }
  }, [xeroConnected, selectedOpenIdSub]);

  // use shared formatCurrency from helper.handler

  const getReminderStageLabel = (stage: string) => {
    switch (stage) {
      case "current":
        return "Current";
      case "pre_due":
        return "Pre-Due";
      case "overdue_stage_1":
        return "1-30 Days";
      case "overdue_stage_2":
        return "31-60 Days";
      case "overdue_stage_3":
        return "60+ Days";
      default:
        return "Unknown";
    }
  };

  if (!xeroConnected) {
    return (
      <DashboardLayout title="Collections">
        <div className="py-12">
          <div className="max-w-md mx-auto">
            <TenantPrompt
              title="Xero Connection Required"
              message="Connect your Xero account to access collections and invoice data."
              showInput={false}
              onConfirm={() => (window.location.href = "/auth")}
              ctaText="Connect Xero"
            />
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
          <Button onClick={loadCollectionsData} variant="secondary" size="sm">
            Refresh
          </Button>
          <Button onClick={handleTriggerScan} size="sm">
            Trigger Scan
          </Button>
        </ActionBar>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
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

        {/* Actions Bar */}
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

        {/* Invoices Table */}
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
