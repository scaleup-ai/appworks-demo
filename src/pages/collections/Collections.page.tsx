import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import showToast from "../../utils/toast";
import * as accountsReceivablesApi from "../../apis/accounts-receivables.api";
import * as collectionsApi from "../../apis/collections.api";
import * as emailApi from "../../apis/email.api";

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
  const { xeroConnected } = useSelector((state: RootState) => state.auth);
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

      // Load invoices
      const invoiceData = await accountsReceivablesApi.listInvoices({ limit: 100 });
      
      // Load scheduled reminders
      const scheduledReminders = await collectionsApi.getScheduledReminders();

      // Process invoices and calculate aging
      const now = new Date();
      const processedInvoices = invoiceData.map(invoice => {
        let daysPastDue = 0;
        let reminderStage = 'current';

        if (invoice.dueDate && invoice.status !== 'PAID') {
          const dueDate = new Date(invoice.dueDate);
          const diffTime = now.getTime() - dueDate.getTime();
          daysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (daysPastDue > 0) {
            if (daysPastDue <= 30) {
              reminderStage = 'overdue_stage_1';
            } else if (daysPastDue <= 60) {
              reminderStage = 'overdue_stage_2';
            } else {
              reminderStage = 'overdue_stage_3';
            }
          } else if (daysPastDue > -7) {
            reminderStage = 'pre_due';
          }
        }

        return {
          ...invoice,
          daysPastDue: Math.max(0, daysPastDue),
          reminderStage,
        };
      });

      // Calculate summary
      const unpaidInvoices = processedInvoices.filter(inv => inv.status !== 'PAID');
      const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const overdueAmount = unpaidInvoices
        .filter(inv => (inv.daysPastDue || 0) > 0)
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

    } catch (error) {
      console.error('Failed to load collections data:', error);
      showToast('Failed to load collections data', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScan = async () => {
    try {
      await collectionsApi.triggerScan();
      showToast('Collections scan triggered successfully', { type: 'success' });
      await loadCollectionsData(); // Refresh data
    } catch (error) {
      showToast('Failed to trigger collections scan', { type: 'error' });
    }
  };

  const handleGenerateEmails = async () => {
    if (selectedInvoices.size === 0) {
      showToast('Please select invoices to generate emails for', { type: 'warning' });
      return;
    }

    setGeneratingEmails(true);
    try {
      const selectedInvoiceData = invoices.filter(inv => selectedInvoices.has(inv.invoiceId));
      const emailPromises = selectedInvoiceData.map(async (invoice) => {
        try {
          const draft = await emailApi.generateEmailDraft({
            invoiceId: invoice.invoiceId,
            amount: invoice.amount,
            dueDate: invoice.dueDate || undefined,
            stage: invoice.reminderStage || 'overdue_stage_1',
            customerName: `Customer for ${invoice.number}`,
          });
          return { invoice, draft, success: true };
        } catch (error) {
          return { invoice, error, success: false };
        }
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        showToast(`Generated ${successful} email drafts successfully`, { type: 'success' });
        console.log('Generated email drafts:', results.filter(r => r.success));
      }
      if (failed > 0) {
        showToast(`Failed to generate ${failed} email drafts`, { type: 'warning' });
      }

      setSelectedInvoices(new Set()); // Clear selection
    } catch (error) {
      showToast('Failed to generate email drafts', { type: 'error' });
    } finally {
      setGeneratingEmails(false);
    }
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
    const overdueInvoices = invoices.filter(inv => 
      inv.status !== 'PAID' && (inv.daysPastDue || 0) > 0
    );
    if (selectedInvoices.size === overdueInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(overdueInvoices.map(inv => inv.invoiceId)));
    }
  };

  useEffect(() => {
    if (xeroConnected) {
      loadCollectionsData();
    } else {
      setLoading(false);
    }
  }, [xeroConnected]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getReminderStageColor = (stage: string) => {
    switch (stage) {
      case 'current': return 'text-green-600 bg-green-100';
      case 'pre_due': return 'text-blue-600 bg-blue-100';
      case 'overdue_stage_1': return 'text-yellow-600 bg-yellow-100';
      case 'overdue_stage_2': return 'text-orange-600 bg-orange-100';
      case 'overdue_stage_3': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getReminderStageLabel = (stage: string) => {
    switch (stage) {
      case 'current': return 'Current';
      case 'pre_due': return 'Pre-Due';
      case 'overdue_stage_1': return '1-30 Days';
      case 'overdue_stage_2': return '31-60 Days';
      case 'overdue_stage_3': return '60+ Days';
      default: return 'Unknown';
    }
  };

  if (!xeroConnected) {
    return (
      <DashboardLayout title="Collections">
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
              🔗
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Xero Connection Required</h3>
            <p className="text-gray-600 mb-6">
              Connect your Xero account to access collections and invoice data.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Connect Xero
            </Button>
          </div>
        </Card>
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
        <div className="flex gap-2">
          <Button onClick={loadCollectionsData} variant="secondary" size="sm">
            Refresh
          </Button>
          <Button onClick={handleTriggerScan} size="sm">
            Trigger Scan
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <Button
                onClick={handleSelectAll}
                variant="secondary"
                size="sm"
              >
                {selectedInvoices.size > 0 ? 'Deselect All' : 'Select Overdue'}
              </Button>
              {selectedInvoices.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedInvoices.size} invoice{selectedInvoices.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <Button
              onClick={handleGenerateEmails}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Past Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices
                  .filter(invoice => invoice.status !== 'PAID')
                  .sort((a, b) => (b.daysPastDue || 0) - (a.daysPastDue || 0))
                  .map((invoice) => (
                  <tr key={invoice.invoiceId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.has(invoice.invoiceId)}
                        onChange={() => handleSelectInvoice(invoice.invoiceId)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.number}</div>
                      <div className="text-sm text-gray-500">{invoice.invoiceId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'No due date'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(invoice.daysPastDue || 0) > 0 ? invoice.daysPastDue : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReminderStageColor(invoice.reminderStage || 'current')}`}>
                        {getReminderStageLabel(invoice.reminderStage || 'current')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{invoice.status || 'Unknown'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.filter(inv => inv.status !== 'PAID').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No outstanding invoices found
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CollectionsPage;