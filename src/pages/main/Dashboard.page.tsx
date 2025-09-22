import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "zustand";
import {
  useXeroConnected,
  useSelectedTenantId,
  useSetSelectedTenantId,
  useCollectionsLoading,
} from "../../store/hooks";
import { useCollectionsStore } from "../../store/collections.store";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
// Zustand store hooks used instead of Redux
import showToast from "../../utils/toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import {
  initializeAgents,
  loadDashboardData,
  handleTriggerCollectionsScan,
  handleTestEmailGeneration,
  handleTestPaymentReconciliation,
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
  const handleRefreshDataHandler = async () => {
    setRefreshing(true);
    try {
      await loadDashboardDataHandler();
      showToast("Dashboard data refreshed", { type: "success" });
    } finally {
      setRefreshing(false);
    }
  } 
  const navigate = useNavigate();
  // Zustand hydration gate
  const authStore = useAuthStore();
  const isHydrated = useStore(useAuthStore, (state) => !!state.setAuth);
  const xeroConnected = useXeroConnected();
  const selectedTenantId = useSelectedTenantId();
  const setSelectedTenantId = useSetSelectedTenantId();
  // Debug logging for troubleshooting redirect issue
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[Dashboard Debug] Zustand state:", {
      isHydrated,
      xeroConnected,
      selectedTenantId,
      authStore,
    });
  }, [isHydrated, xeroConnected, selectedTenantId]);
  // Debug logging for troubleshooting redirect issue
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[Dashboard Debug] Zustand state:", {
      isHydrated,
      xeroConnected,
      selectedTenantId,
      authStore,
    });
  }, [isHydrated, xeroConnected, selectedTenantId]);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    collectedThisMonth: 0,
    scheduledReminders: 0,
    unmatchedPayments: 0,
  });
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const collectionsLoading = useCollectionsLoading();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTenantPrompt, setShowTenantPrompt] = useState(false);
  const [tenantInput, setTenantInput] = useState("");

  // Replace local implementations with handler calls
  const initializeAgentsHandler = () => initializeAgents(setAgents);
  const loadDashboardDataHandler = () => loadDashboardData(selectedTenantId, setStats, setLoading);
  const handleTriggerCollectionsScanHandler = () => handleTriggerCollectionsScan(loadDashboardDataHandler);
  const handleTestEmailGenerationHandler = () => handleTestEmailGeneration();
  const handleTestPaymentReconciliationHandler = () => handleTestPaymentReconciliation();

  useEffect(() => {
    // Only proceed once Zustand is hydrated
    if (!isHydrated) return;
    initializeAgentsHandler();
    // Use Zustand as the single source of truth for auth state
    if (!xeroConnected) {
      // If not connected, redirect to /auth
      navigate("/auth", { replace: true });
      return;
    }
    if (!selectedTenantId) {
      setShowTenantPrompt(true);
      setLoading(false);
      return;
    }
    loadDashboardDataHandler();
    // Consideration for future JWT-based auth:
    // If using JWT, validate token here and refresh if expired.
    // For now, rely on Zustand state only.
  }, [xeroConnected, selectedTenantId, isHydrated, navigate]);

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

  if (!isHydrated || loading || collectionsLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  // Remove dashboard tenant prompt. Tenant selection must happen in auth flow.
  if (showTenantPrompt) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-md p-8 text-center bg-white rounded-lg shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">No tenant selected</h2>
            <p className="mb-6 text-gray-700">Please sign in and select a tenant in the authentication flow.</p>
            <Button onClick={() => navigate("/auth", { replace: true })}>Go to Auth</Button>
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
          <Button onClick={handleRefreshDataHandler} loading={refreshing} size="sm" variant="secondary">
            Refresh Data
          </Button>
          {!xeroConnected && (
            <Button onClick={() => navigate("/auth", { replace: true })} size="sm">
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
              onClick={handleTriggerCollectionsScanHandler}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">🔍</div>
              <div className="font-medium">Trigger Collections Scan</div>
              <div className="text-sm text-gray-500">Scan for overdue invoices</div>
            </Button>

            <Button
              onClick={handleTestEmailGenerationHandler}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">✍️</div>
              <div className="font-medium">Test Email Generation</div>
              <div className="text-sm text-gray-500">Generate sample reminder</div>
            </Button>

            <Button
              onClick={handleTestPaymentReconciliationHandler}
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
