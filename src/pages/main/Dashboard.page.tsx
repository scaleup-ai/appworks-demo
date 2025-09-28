import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import * as accountsReceivablesApi from "../../apis/accounts-receivables.api";
import * as collectionsApi from "../../apis/collections.api";
import * as emailApi from "../../apis/email.api";
import * as paymentApi from "../../apis/payment.api";
import * as auditApi from "../../apis/audit.api";
import Button from "../../components/ui/Button.component";
import Card from "../../components/ui/Card.component";
import LoadingSpinner from "../../components/ui/LoadingSpinner.component";
import StatusBadge from "../../components/ui/StatusBadge.component";
import SummaryCardGrid from "../../components/ui/SummaryCardGrid.component";
import ActionBar from "../../components/ui/ActionBar.component";
import { RootState } from "../../store/store";
import { AuthStorage } from "../../store/slices/auth.slice";
import showToast from "../../utils/toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { copyToClipboard, downloadJson, formatCurrency, openExternal } from "../../helpers/ui.helper";
import { useApi } from "../../hooks/useApi";
import { useNavigate } from "react-router-dom";
import { ROOT_PATH } from "../../router/router";
import { listAgents } from "../../apis/agents.api";

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
  const navigate = useNavigate();
  const { xeroConnected, selectedOpenIdSub, selectedTenantId } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    collectedThisMonth: 0,
    scheduledReminders: 0,
    unmatchedPayments: 0,
  });
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; message: string; when?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      // Use selectedTenantId (or persisted tenant id) as the tenant identifier
      // for Xero API calls. Use selectedOpenIdSub (or persisted OpenID-sub) as
      // the per-user identifier for header-based endpoints like audit. These
      // are distinct values and must not be conflated.
      const tenantId = selectedTenantId ?? AuthStorage.getSelectedTenantId();
      const openidSub = selectedOpenIdSub ?? AuthStorage.getSelectedOpenIdSub();
      if (!tenantId && !openidSub) {
        // If we have no tenant selection and no user-scoped subject, ask user to select tenant
        navigate(`${ROOT_PATH}select-tenant`);
        return;
      }

      const [invoices, scheduledReminders, events, agentList] = await Promise.all([
        accountsReceivablesApi.listInvoices({ limit: 100, tenantId: tenantId || undefined }),
        collectionsApi.getScheduledReminders(),
        auditApi.listRecentAuditEvents({ limit: 10 }),
        listAgents(),
      ]);

      const totalInvoices = invoices.length;
      const outstandingAmount = invoices
        .filter((inv) => inv.status !== "PAID")
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      const now = new Date();
      const overdueAmount = invoices
        .filter((inv) => inv.status !== "PAID" && inv.dueDate && new Date(inv.dueDate) < now)
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      setStats({
        totalInvoices,
        outstandingAmount,
        overdueAmount,
        collectedThisMonth: 0,
        scheduledReminders: scheduledReminders.length,
        unmatchedPayments: 0,
      });

      const mappedEvents = (events || []).map((e) => {
        let msg = e.event_type;
        try {
          if (e.payload && typeof e.payload === "object") {
            if (e.payload.message) msg = String(e.payload.message);
            else if (e.payload.action) msg = `${e.event_type}: ${String(e.payload.action)}`;
            else if (e.payload.tool) msg = `${e.event_type}: ${String(e.payload.tool)}`;
          }
        } catch {}
        return {
          id: e.id || `${e.event_type}_${e.created_at || ""}_${Math.random()}`,
          message: msg,
          when: e.created_at,
        };
      });
      setRecentActivity(mappedEvents);
      setAgents(agentList);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      showToast("Failed to load dashboard data", { type: "error" });
    }
  }, [selectedOpenIdSub, navigate]);

  const { execute: refreshData, isLoading: isRefreshing } = useApi(loadDashboardData, {
    successMessage: "Dashboard data refreshed",
  });

  const { execute: triggerScan, isLoading: isScanning } = useApi(collectionsApi.triggerScan, {
    successMessage: "Collections scan triggered",
  });

  const { execute: testEmail, isLoading: isTestingEmail } = useApi(emailApi.generateEmailDraft, {
    successMessage: "Email draft generated successfully",
  });

  const { execute: testPayment, isLoading: isTestingPayment } = useApi(paymentApi.reconcilePayment, {
    successMessage: "Payment reconciliation test succeeded",
  });

  const handleTriggerCollectionsScan = async () => {
    await triggerScan();
    await refreshData();
  };

  const handleTestEmailGeneration = () => {
    testEmail({
      invoiceId: "test-invoice-001",
      amount: 1500,
      stage: "overdue_stage_1",
      customerName: "Test Customer Ltd",
    });
  };

  const handleTestPaymentReconciliation = () => {
    testPayment({ paymentId: "test-payment-001", amount: 1500, reference: "INV-001" });
  };

  // Extracted handlers to keep JSX concise
  const handleExportSnapshot = () => {
    const snapshot = { stats, agents, generatedAt: new Date().toISOString() };
    downloadJson("dashboard-snapshot.json", snapshot);
    showToast("Dashboard snapshot downloaded", { type: "success" });
  };

  const handleCopySnapshot = () => {
    const snapshotText = JSON.stringify({ stats, agents }, null, 2);
    copyToClipboard(snapshotText);
    showToast("Copied snapshot to clipboard", { type: "success" });
  };

  useEffect(() => {
    let cancelled = false;

    const waitForPersistedIds = async (timeoutMs = 3000, pollInterval = 200) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const tenantIdNow = selectedTenantId ?? AuthStorage.getSelectedTenantId();
        const openidNow = selectedOpenIdSub ?? AuthStorage.getSelectedOpenIdSub();
        if (tenantIdNow || openidNow) return { tenantId: tenantIdNow, openid: openidNow };
        // pause briefly to allow callback/selector to persist values
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, pollInterval));
      }
      return {
        tenantId: selectedTenantId ?? AuthStorage.getSelectedTenantId(),
        openid: selectedOpenIdSub ?? AuthStorage.getSelectedOpenIdSub(),
      };
    };

    const startLoad = async () => {
      if (!xeroConnected) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const { tenantId, openid } = await waitForPersistedIds();
        // If we still don't have any tenancy or user subject, redirect to tenant selection
        if (!tenantId && !openid) {
          navigate(`${ROOT_PATH}select-tenant`);
          return;
        }

        if (!cancelled) {
          await refreshData();
        }
      } catch (err) {
        console.error("Failed to load dashboard data (guarded):", err);
        showToast("Failed to load dashboard data", { type: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    startLoad();
    return () => {
      cancelled = true;
    };
  }, [xeroConnected, refreshData, selectedTenantId, selectedOpenIdSub, navigate]);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Autopilot Receivables Dashboard"
      actions={
        <ActionBar>
          <Button onClick={() => refreshData()} loading={isRefreshing} size="sm" variant="secondary">
            Refresh Data
          </Button>
          {!xeroConnected && (
            <Button onClick={() => navigate(`${ROOT_PATH}auth`)} size="sm">
              Connect Xero
            </Button>
          )}
          <Button onClick={handleExportSnapshot} size="sm" variant="secondary">
            Export Snapshot
          </Button>
          <Button onClick={handleCopySnapshot} size="sm">
            Copy Snapshot
          </Button>
        </ActionBar>
      }
    >
      <div className="space-y-8">
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

        <Card title="Agent Actions" description="Test and trigger agent operations">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              onClick={handleTriggerCollectionsScan}
              loading={isScanning}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">🔍</div>
              <div className="font-medium">Trigger Collections Scan</div>
              <div className="text-sm text-gray-500">Scan for overdue invoices</div>
            </Button>
            <Button
              onClick={handleTestEmailGeneration}
              loading={isTestingEmail}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">✍️</div>
              <div className="font-medium">Test Email Generation</div>
              <div className="text-sm text-gray-500">Generate sample reminder</div>
            </Button>
            <Button
              onClick={handleTestPaymentReconciliation}
              loading={isTestingPayment}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">🔄</div>
              <div className="font-medium">Test Payment Matching</div>
              <div className="text-sm text-gray-500">Reconcile sample payment</div>
            </Button>
            <Button
              onClick={() => openExternal("/collections", "_blank")}
              className="flex flex-col items-start h-auto p-4 text-left"
              variant="ghost"
            >
              <div className="mb-1 text-lg">📊</div>
              <div className="font-medium">View Collections</div>
              <div className="text-sm text-gray-500">Detailed collections view</div>
            </Button>
          </div>
        </Card>

        <Card title="Recent Activity" description="Latest agent operations and events (from audit)">
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="py-4 text-sm text-gray-500">No recent activity available.</div>
            ) : (
              recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className="w-2 h-2 mr-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{a.message}</span>
                  </div>
                  <span className="text-xs text-gray-500">{a.when ? new Date(a.when).toLocaleString() : "-"}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
