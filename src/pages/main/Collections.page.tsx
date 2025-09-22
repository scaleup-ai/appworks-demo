import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useXeroConnected, useSelectedTenantId, useCollectionsLoading } from "../../store/hooks";
import { useCollectionsStore } from "../../store/collections.store";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import showToast from "../../utils/toast";
import { loadCollectionsData, handleTriggerScan, handleGenerateEmails } from "../../handlers/collections.handler";

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
  const xeroConnected = useXeroConnected();
  const selectedTenantId = useSelectedTenantId();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<CollectionsSummary>({
    totalOutstanding: 0,
    overdueAmount: 0,
    currentAmount: 0,
    scheduledReminders: 0,
    sentReminders: 0,
  });
  const collectionsLoading = useCollectionsLoading();
  const [loading, setLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [generatingEmails, setGeneratingEmails] = useState(false);

  // Handler wrappers for correct usage
  const loadCollectionsDataHandler = () => loadCollectionsData(selectedTenantId, setInvoices, setSummary, setLoading);
  const handleTriggerScanHandler = async () => {
    await handleTriggerScan(() => loadCollectionsDataHandler());
  };
  const handleGenerateEmailsHandler = async () => {
    await handleGenerateEmails(selectedInvoices, invoices, setGeneratingEmails);
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size > 0) {
      setSelectedInvoices(new Set());
    } else {
      const overdue = invoices
        .filter((inv) => (inv.daysPastDue || 0) > 0 && inv.status !== "PAID")
        .map((inv) => inv.invoiceId);
      setSelectedInvoices(new Set(overdue));
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (xeroConnected) {
      if (!selectedTenantId) {
        navigate("/select-tenant", { replace: true });
        return;
      }
      loadCollectionsDataHandler();
    } else {
      setLoading(false);
    }
  }, [xeroConnected]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getReminderStageColor = (stage: string) => {
    switch (stage) {
      case "current":
        return "text-green-600 bg-green-100";
      case "pre_due":
        return "text-blue-600 bg-blue-100";
      case "overdue_stage_1":
        return "text-yellow-600 bg-yellow-100";
      case "overdue_stage_2":
        return "text-orange-600 bg-orange-100";
      case "overdue_stage_3":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

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
        <Card>
          <div className="py-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 text-2xl bg-yellow-100 rounded-full">
              🔗
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">Xero Connection Required</h3>
            <p className="mb-6 text-gray-600">Connect your Xero account to access collections and invoice data.</p>
            <Button onClick={() => navigate("/auth", { replace: true })}>Connect Xero</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  if (loading || collectionsLoading) {
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
      title="Collections"
      actions={
        <div className="flex gap-2">
          <Button onClick={loadCollectionsDataHandler} variant="secondary" size="sm">
            Refresh
          </Button>
          <Button onClick={handleTriggerScanHandler} size="sm">
            Trigger Scan
          </Button>
          <Button onClick={handleGenerateEmailsHandler} size="sm" disabled={generatingEmails}>
            Generate Emails
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalOutstanding)}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.overdueAmount)}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Amount</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.currentAmount)}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled Reminders</p>
              <p className="text-2xl font-bold text-purple-600">{summary.scheduledReminders}</p>
            </div>
          </Card>
        </div>

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
            <Button
              onClick={handleGenerateEmailsHandler}
              loading={generatingEmails}
              disabled={selectedInvoices.size === 0}
            >
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
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReminderStageColor(invoice.reminderStage || "current")}`}
                        >
                          {getReminderStageLabel(invoice.reminderStage || "current")}
                        </span>
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
