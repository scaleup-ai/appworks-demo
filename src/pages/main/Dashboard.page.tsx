import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import * as accountsReceivablesApi from "../../apis/accounts-receivables.api";
import * as collectionsApi from "../../apis/collections.api";
import * as emailApi from "../../apis/email.api";
import * as paymentApi from "../../apis/payment.api";
import Button from "../../components/ui/Button.component";
import Card from "../../components/ui/Card.component";
import LoadingSpinner from "../../components/ui/LoadingSpinner.component";
import StatusBadge from "../../components/ui/StatusBadge.component";
import TenantPrompt from "../../components/ui/TenantPrompt.component";
import SummaryCardGrid from "../../components/ui/SummaryCardGrid.component";
import ActionBar from "../../components/ui/ActionBar.component";
import { RootState } from "../../store/store";
import { AuthStorage } from "../../store/slices/auth.slice";
import showToast from "../../utils/toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { copyToClipboard, downloadJson, formatCurrency } from "../../helpers/ui.helper";
import {
  makeHandleRefreshData,
  makeHandleTriggerCollectionsScan,
  makeHandleTestEmailGeneration,
  makeHandleTestPaymentReconciliation,
} from "../../handlers/dashboard.handler";

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
  const dispatch = useDispatch();
  const { xeroConnected, selectedOpenIdSub } = useSelector((state: RootState) => state.auth);
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
    } catch {
      setAgents([]);
      showToast("Failed to load agent status", { type: "error" });
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load invoices data scoped to selected tenant (Redux is primary source)
      const openid_sub = selectedOpenIdSub ?? AuthStorage.getSelectedTenantId();
      const invoices = await accountsReceivablesApi.listInvoices({ limit: 100, tenantId: openid_sub || undefined });

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

  const handleRefreshData = makeHandleRefreshData(loadDashboardData, setRefreshing);
  const handleTriggerCollectionsScan = makeHandleTriggerCollectionsScan(collectionsApi.triggerScan, loadDashboardData);
  const handleTestEmailGeneration = makeHandleTestEmailGeneration(emailApi.generateEmailDraft);
  const handleTestPaymentReconciliation = makeHandleTestPaymentReconciliation(paymentApi.reconcilePayment);

  useEffect(() => {
    initializeAgents();
    if (xeroConnected) {
      const openid_sub = (selectedOpenIdSub ?? AuthStorage.getSelectedTenantId()) || "";
      if (!openid_sub) {
        setShowTenantPrompt(true);
        setLoading(false);
        return;
      }
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [xeroConnected, selectedOpenIdSub]);

  // use shared formatCurrency from helper.handler

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
          <div className="w-full max-w-md">
            <TenantPrompt
              title="Select Tenant"
              message="Please enter or select your organisation/tenant ID to view dashboard data."
              value={tenantInput}
              onChange={(v) => setTenantInput(v)}
              onConfirm={(v) => {
                if (v && String(v).trim()) {
                  const val = String(v).trim();
                  AuthStorage.setSelectedTenantId(val);
                  dispatch({ type: "auth/selectTenant", payload: val });
                  setShowTenantPrompt(false);
                  setLoading(true);
                  setTimeout(() => loadDashboardData(), 100);
                }
              }}
              ctaText="Confirm Tenant"
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Autopilot Receivables Dashboard"
      actions={
        <ActionBar>
          <Button onClick={handleRefreshData} loading={refreshing} size="sm" variant="secondary">
            Refresh Data
          </Button>
          {!xeroConnected && (
            <Button onClick={() => (window.location.href = "/auth")} size="sm">
              Connect Xero
            </Button>
          )}
          <Button
            onClick={() => {
              const snapshot = { stats, agents, generatedAt: new Date().toISOString() };
              downloadJson("dashboard-snapshot.json", snapshot);
              showToast("Dashboard snapshot downloaded", { type: "success" });
            }}
            size="sm"
            variant="secondary"
          >
            Export Snapshot
          </Button>
          <Button
            onClick={() => {
              const snapshotText = JSON.stringify({ stats, agents }, null, 2);
              copyToClipboard(snapshotText);
              showToast("Copied snapshot to clipboard", {
                type: "success",
              });
            }}
            size="sm"
          >
            Copy Snapshot
          </Button>
        </ActionBar>
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
        <SummaryCardGrid
          items={[
            {
              title: "Total Invoices",
              value: stats.totalInvoices,
              className: "border-l-4 border-l-blue-500",
              icon: "📄",
            },
            {
              title: "Outstanding",
              value: formatCurrency(stats.outstandingAmount),
              className: "border-l-4 border-l-yellow-500",
              icon: "💰",
            },
            {
              title: "Overdue",
              value: formatCurrency(stats.overdueAmount),
              className: "border-l-4 border-l-red-500",
              icon: "⚠️",
            },
            {
              title: "Scheduled Reminders",
              value: stats.scheduledReminders,
              className: "border-l-4 border-l-green-500",
              icon: "📧",
            },
          ]}
        />

        {/* Agent Status */}
        <Card title="Agent Status" description="Monitor the status of all autopilot agents">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <StatusBadge
                    variant={agent.status === "active" ? "green" : agent.status === "inactive" ? "gray" : "red"}
                  >
                    {agent.status}
                  </StatusBadge>
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
              onClick={() => {
                // open demo collections in a new tab using handlers
                import("../../helpers/ui.helper")
                  .then((h) => h.openExternal("/collections", "_blank"))
                  .catch((e) => {
                    console.warn("Failed to open collections", e);
                    window.open("/collections", "_blank");
                  });
              }}
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
