import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import AppLayout from "./App.layout";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  actions,
  sidebar,
}) => {
  const { isLoading: xeroLoading } = useSelector((state: RootState) => state.xero);
  const { isLoading: collectionsLoading } = useSelector((state: RootState) => state.collections);
  const { isLoading: emailLoading } = useSelector((state: RootState) => state.email);
  const { isLoading: paymentLoading } = useSelector((state: RootState) => state.payment);

  const isAnyLoading = xeroLoading || collectionsLoading || emailLoading || paymentLoading;

  return (
    <AppLayout title={title}>
      <div className="space-y-6">
        {/* Header with title and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {title || "Dashboard"}
            </h1>
            {isAnyLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Main content */}
          <div className={sidebar ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {children}
            </div>
          </div>

          {/* Sidebar */}
          {sidebar && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-6">
                {sidebar}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardLayout;