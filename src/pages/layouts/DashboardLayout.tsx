import React from "react";
import { useXeroLoading, useCollectionsLoading, useEmailLoading, usePaymentLoading } from "../../store/hooks";
import AppLayout from "./App.layout";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, actions, sidebar }) => {
  const xeroLoading = useXeroLoading();
  const collectionsLoading = useCollectionsLoading();
  const emailLoading = useEmailLoading();
  const paymentLoading = usePaymentLoading();

  const isAnyLoading = xeroLoading || collectionsLoading || emailLoading || paymentLoading;

  return (
    <AppLayout title={title}>
      <div className="space-y-6">
        {/* Header with title and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{title || "Dashboard"}</h1>
            {isAnyLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                Loading...
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Main content */}
          <div className={sidebar ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="p-6 bg-white border rounded-lg shadow-sm">{children}</div>
          </div>

          {/* Sidebar */}
          {sidebar && (
            <div className="lg:col-span-1">
              <div className="sticky p-4 bg-white border rounded-lg shadow-sm top-6">{sidebar}</div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardLayout;
