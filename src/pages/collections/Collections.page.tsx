import React from "react";
import DashboardLayout from "../layouts/DashboardLayout";

const CollectionsPage: React.FC = () => {
  return (
    <DashboardLayout title="Collections">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Collections Management</h2>
          <p className="text-gray-600 mb-4">Manage your accounts receivable collections and reminders.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-900">Outstanding Invoices</h3>
              <p className="text-2xl font-bold text-blue-600">$0</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <h3 className="font-semibold text-yellow-900">Overdue</h3>
              <p className="text-2xl font-bold text-yellow-600">$0</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold text-green-900">Collected This Month</h3>
              <p className="text-2xl font-bold text-green-600">$0</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CollectionsPage;
