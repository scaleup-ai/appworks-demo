import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import DashboardLayout from "../layouts/DashboardLayout";

const DashboardPage: React.FC = () => {
  const { xeroConnected } = useSelector((state: RootState) => state.auth);

  const stats = [
    { title: "Total Invoices", value: "0", color: "blue" },
    { title: "Outstanding", value: "$0", color: "yellow" },
    { title: "Collected", value: "$0", color: "green" },
    { title: "Overdue", value: "0", color: "red" },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Message */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ScaleUp AI</h2>
          <p className="text-gray-600">
            {xeroConnected
              ? "Your Xero account is connected. Manage your receivables and collections below."
              : "Connect your Xero account to access your financial data."}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className={`bg-white p-6 rounded-lg shadow border-l-4 border-${stat.color}-500`}>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.title}</h3>
              <p className={`text-2xl font-bold text-${stat.color}-600 mt-2`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="p-4 text-left border rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">View Collections</h4>
              <p className="text-sm text-gray-500">Manage outstanding invoices</p>
            </button>
            <button className="p-4 text-left border rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">Process Payments</h4>
              <p className="text-sm text-gray-500">Reconcile recent payments</p>
            </button>
            <button className="p-4 text-left border rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">Send Reminders</h4>
              <p className="text-sm text-gray-500">Follow up on overdue invoices</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
