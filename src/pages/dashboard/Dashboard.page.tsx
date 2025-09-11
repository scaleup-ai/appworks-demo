import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { getScheduledStart } from "../../store/slices/collections.slice";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import showToast from "../../utils/toast";

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { scheduledReminders, isRunning: collectionsRunning } = useSelector(
    (state: RootState) => state.collections
  );
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(
        getScheduledStart({
          onError: (error: any) =>
            showToast(`Failed to load reminders: ${error.message}`, {
              type: "error",
            }),
        })
      );
    }
  }, [dispatch, isAuthenticated]);

  const stats = [
    {
      title: "Scheduled Reminders",
      value: scheduledReminders.length,
      description: "Active reminder tasks",
      color: "blue",
    },
    {
      title: "Collections Status",
      value: collectionsRunning ? "Running" : "Stopped",
      description: "Background process status",
      color: collectionsRunning ? "green" : "red",
    },
    {
      title: "Integration Status",
      value: isAuthenticated ? "Connected" : "Disconnected",
      description: "Xero connection status",
      color: isAuthenticated ? "green" : "red",
    },
  ];

  return (
    <DashboardLayout
      title="Dashboard"
      actions={
        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
          size="sm"
        >
          Refresh
        </Button>
      }
      sidebar={
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          <div className="space-y-2">
            <Button
              className="w-full justify-start"
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/collections")}
            >
              Manage Collections
            </Button>
            <Button
              className="w-full justify-start"
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/payments")}
            >
              View Payments
            </Button>
            <Button
              className="w-full justify-start"
              variant="ghost"
              size="sm"
              onClick={() =>
                import("../../apis/xero.api").then(
                  ({ getXeroAuthUrl, capturePostAuthRedirect }) => {
                    try {
                      capturePostAuthRedirect();
                    } catch {}
                    window.location.href = getXeroAuthUrl();
                  }
                )
              }
            >
              Xero Settings
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <div className="space-y-2">
                <div
                  className={`text-3xl font-bold ${
                    stat.color === "blue"
                      ? "text-blue-600"
                      : stat.color === "green"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {stat.title}
                </div>
                <div className="text-xs text-gray-500">{stat.description}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card title="Recent Activity" description="Latest system events">
          {scheduledReminders.length > 0 ? (
            <div className="space-y-3">
              {scheduledReminders.slice(0, 5).map((reminder, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium">
                        Reminder scheduled for invoice {reminder.invoiceId}
                      </div>
                      <div className="text-xs text-gray-500">
                        Stage: {reminder.stage} • Status: {reminder.status}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(reminder.scheduledAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                📄
              </div>
              <p>No recent activity</p>
              <p className="text-xs mt-1">
                Connect to Xero to start seeing activity
              </p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
