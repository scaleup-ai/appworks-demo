import React, { useEffect, useState } from "react";
import { useXeroConnected, useSelectedTenantId, useSetSelectedTenantId } from "../../store/hooks";
import * as accountsReceivablesApi from "../../apis/accounts-receivables.api";
import * as collectionsApi from "../../apis/collections.api";
import * as emailApi from "../../apis/email.api";
import * as paymentApi from "../../apis/payment.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
// Zustand store hooks used instead of Redux
import showToast from "../../utils/toast";
import DashboardLayout from "../layouts/DashboardLayout";

interface DashboardStats {
  totalInvoices: number;
  outstandingAmount: number;
  overdueAmount: number;
  collectedThisMonth: number;
  scheduledReminders: number;
  unmatchedPayments: number;
}

interface AgentStatus {
  name: string;
  status: "active" | "inactive" | "error";
  lastRun?: string;
  description: string;
}

const DashboardPage: React.FC = () => {
  const xeroConnected = useXeroConnected();
  const selectedTenantId = useSelectedTenantId();
  const setSelectedTenantId = useSetSelectedTenantId();
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    collectedThisMonth: 0,
    scheduledReminders: 0,
    unmatchedPayments: 0,
  });
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTenantPrompt, setShowTenantPrompt] = useState(false);
  const [tenantInput, setTenantInput] = useState("");

  const initializeAgents = async () => {
    try {
      // Fetch real agent status from backend
      const agentList = await import("../../apis/agents.api").then((m) => m.listAgents());
      setAgents(agentList);
    } catch (err) {
      setAgents([]);
      showToast("Failed to load agent status", { type: "error" });
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load invoices data scoped to selected tenant (store first, fallback to localStorage)
      const tenantId = selectedTenantId || localStorage.getItem("selectedTenantId") || null;
      const invoices = await accountsReceivablesApi.listInvoices({ limit: 100, tenantId: tenantId || undefined });

      // Load scheduled collections
      const scheduledReminders = await collectionsApi.getScheduledReminders();

      // Calculate stats from the data
      const totalInvoices = invoices.length;
      const outstandingAmount = invoices
        .filter((inv) => inv.status !== "PAID")
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      const now = new Date();
      const overdueAmount = invoices
        .filter((inv) => {
          if (inv.status === "PAID" || !inv.dueDate) return false;
          return new Date(inv.dueDate) < now;
        })
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      setStats({
        totalInvoices,
        outstandingAmount,
        overdueAmount,
        collectedThisMonth: 0, // Would need payment history to calculate
        scheduledReminders: scheduledReminders.length,
        unmatchedPayments: 0, // Would need payment reconciliation data
      });
    } catch {
      console.error("Failed to load dashboard data:");
      showToast("Failed to load dashboard data", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
      showToast("Dashboard data refreshed", { type: "success" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleTriggerCollectionsScan = async () => {
    try {
      await collectionsApi.triggerScan();
      showToast("Collections scan triggered", { type: "success" });
      await loadDashboardData(); // Refresh data
    } catch {
      showToast("Failed to trigger collections scan", { type: "error" });
    }
  };

  const handleTestEmailGeneration = async () => {
    try {
      const testRequest = {
        invoiceId: "test-invoice-001",
        amount: 1500,
        // keep payload minimal; let backend determine dates when generating drafts
        stage: "overdue_stage_1",
        customerName: "Test Customer Ltd",
      };

      const draft = await emailApi.generateEmailDraft(testRequest);
      showToast("Email draft generated successfully", { type: "success" });

      // Show preview in console for now
      console.log("Generated email draft:", draft);
    } catch {
      showToast("Failed to generate email draft", { type: "error" });
    }
  };

  const handleTestPaymentReconciliation = async () => {
    try {
      const testRequest = {
        paymentId: "test-payment-001",
        amount: 1500,
        reference: "INV-001",
      };

      const result = await paymentApi.reconcilePayment(testRequest);
      showToast(`Payment reconciliation: ${result.matched ? "Matched" : "Unmatched"}`, {
        type: result.matched ? "success" : "warning",
      });
    } catch {
      showToast("Failed to reconcile payment", { type: "error" });
    }
  };

  useEffect(() => {
    initializeAgents();
    if (xeroConnected) {
      const tenantId = selectedTenantId || localStorage.getItem("selectedTenantId") || "";
      if (!tenantId) {
        setShowTenantPrompt(true);
        setLoading(false);
        return;
      }
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [xeroConnected, selectedTenantId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: AgentStatus["status"]) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "inactive":
        return "text-gray-600 bg-gray-100";
      case "error":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (showTenantPrompt) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-md p-8 text-center bg-white rounded-lg shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Select Tenant</h2>
            <p className="mb-6 text-gray-700">
              Please enter or select your organisation/tenant ID to view dashboard data.
            </p>
            <input
              type="text"
              value={tenantInput}
              onChange={(e) => setTenantInput(e.target.value)}
              placeholder="Tenant ID"
              className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (tenantInput.trim()) {
                  localStorage.setItem("selectedTenantId", tenantInput.trim());
                  setSelectedTenantId(tenantInput.trim());
                  setShowTenantPrompt(false);
                  setLoading(true);
                  setTimeout(() => loadDashboardData(), 100);
                }
              }}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Confirm Tenant
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Autopilot Receivables Dashboard"
      actions={
        <div className="flex gap-2">
          <Button onClick={handleRefreshData} loading={refreshing} size="sm" variant="secondary">
            Refresh Data
          </Button>
          {!xeroConnected && (
            <Button onClick={() => (window.location.href = "/auth")} size="sm">
              Connect Xero
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        {/* Connection Status */}
        {!xeroConnected && (
          <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <div className="flex items-center">
              <div className="w-5 h-5 mr-3 text-yellow-600">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Xero Not Connected</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Connect your Xero account to enable the Data Integration Agent and access your financial data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalInvoices}</p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">📄</div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.outstandingAmount)}</p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">💰</div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">⚠️</div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled Reminders</p>
                <p className="text-2xl font-bold text-green-600">{stats.scheduledReminders}</p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">📧</div>
            </div>
          </Card>
        </div>

        {/* Agent Status */}
        <Card title="Agent Status" description="Monitor the status of all autopilot agents">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
                <p className="mb-2 text-sm text-gray-600">{agent.description}</p>
                {agent.lastRun && (
                  <p className="text-xs text-gray-500">Last run: {new Date(agent.lastRun).toLocaleString()}</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Agent Actions" description="Test and trigger agent operations">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              onClick={handleTriggerCollectionsScan}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">🔍</div>
              <div className="font-medium">Trigger Collections Scan</div>
              <div className="text-sm text-gray-500">Scan for overdue invoices</div>
            </Button>

            <Button
              onClick={handleTestEmailGeneration}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">✍️</div>
              <div className="font-medium">Test Email Generation</div>
              <div className="text-sm text-gray-500">Generate sample reminder</div>
            </Button>

            <Button
              onClick={handleTestPaymentReconciliation}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">🔄</div>
              <div className="font-medium">Test Payment Matching</div>
              <div className="text-sm text-gray-500">Reconcile sample payment</div>
            </Button>

            <Button
              onClick={() => window.open("/collections", "_blank")}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">📊</div>
              <div className="font-medium">View Collections</div>
              <div className="text-sm text-gray-500">Detailed collections view</div>
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" description="Latest agent operations and events">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-2 h-2 mr-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Collections Reminder Agent scanned 15 invoices</span>
              </div>
              <span className="text-xs text-gray-500">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-2 h-2 mr-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Email Copywriter Agent generated 3 reminder emails</span>
              </div>
              <span className="text-xs text-gray-500">5 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-2 h-2 mr-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Payment Reconciliation Agent matched 2 payments</span>
              </div>
              <span className="text-xs text-gray-500">10 minutes ago</span>
            </div>
            {!xeroConnected && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 mr-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-gray-500">Data Integration Agent waiting for Xero connection</span>
                </div>
                <span className="text-xs text-gray-500">-</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
