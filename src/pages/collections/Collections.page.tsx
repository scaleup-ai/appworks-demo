import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import {
  startCollectionsStart,
  stopCollectionsStart,
  triggerScanStart,
  getScheduledStart,
} from "../../store/slices/collections.slice";
import { generateDraftStart } from "../../store/slices/email.slice";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import showToast from "../../utils/toast";

const CollectionsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, isRunning, scheduledReminders, error } = useSelector(
    (state: RootState) => state.collections
  );
  const { currentDraft, isLoading: emailLoading } = useSelector(
    (state: RootState) => state.email
  );

  const [selectedInvoice, setSelectedInvoice] = useState<string>("");

  useEffect(() => {
    dispatch(getScheduledStart({
      onError: (error) => showToast(`Failed to load reminders: ${error.message}`, { type: 'error' })
    }));
  }, [dispatch]);

  const handleStartCollections = () => {
    dispatch(startCollectionsStart({
      onSuccess: () => showToast("Collections started successfully", { type: 'success' }),
      onError: (error) => showToast(`Failed to start collections: ${error.message}`, { type: 'error' })
    }));
  };

  const handleStopCollections = () => {
    dispatch(stopCollectionsStart({
      onSuccess: () => showToast("Collections stopped successfully", { type: 'success' }),
      onError: (error) => showToast(`Failed to stop collections: ${error.message}`, { type: 'error' })
    }));
  };

  const handleTriggerScan = () => {
    dispatch(triggerScanStart({
      onSuccess: () => {
        showToast("Scan triggered successfully", { type: 'success' });
        // Refresh the list
        dispatch(getScheduledStart({}));
      },
      onError: (error) => showToast(`Failed to trigger scan: ${error.message}`, { type: 'error' })
    }));
  };

  const handleGenerateDraft = (invoiceId: string) => {
    dispatch(generateDraftStart({
      invoiceId,
      stage: "overdue_stage_1",
      customerName: "Customer",
      onSuccess: () => showToast("Email draft generated successfully", { type: 'success' }),
      onError: (error) => showToast(`Failed to generate draft: ${error.message}`, { type: 'error' })
    }));
  };

  return (
    <DashboardLayout
      title="Collections Management"
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={handleTriggerScan}
            variant="secondary"
            size="sm"
            loading={isLoading}
          >
            Trigger Scan
          </Button>
          {isRunning ? (
            <Button
              onClick={handleStopCollections}
              variant="danger"
              size="sm"
              loading={isLoading}
            >
              Stop Collections
            </Button>
          ) : (
            <Button
              onClick={handleStartCollections}
              variant="primary"
              size="sm"
              loading={isLoading}
            >
              Start Collections
            </Button>
          )}
        </div>
      }
      sidebar={
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Email Draft Generator</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice ID
              </label>
              <input
                type="text"
                value={selectedInvoice}
                onChange={(e) => setSelectedInvoice(e.target.value)}
                placeholder="Enter invoice ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              onClick={() => selectedInvoice && handleGenerateDraft(selectedInvoice)}
              disabled={!selectedInvoice}
              loading={emailLoading}
              size="sm"
              className="w-full"
            >
              Generate Draft
            </Button>
          </div>

          {currentDraft && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-gray-900">Generated Draft</h4>
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                <div className="font-medium mb-2">Subject:</div>
                <div className="mb-3 text-gray-700">{currentDraft.subject}</div>
                <div className="font-medium mb-2">Body:</div>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {currentDraft.bodyText}
                </div>
              </div>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status Card */}
        <Card
          title="Collections Status"
          description="Current status of the collections reminder system"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">
                {isRunning ? 'Collections Running' : 'Collections Stopped'}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {scheduledReminders.length} scheduled reminders
            </div>
          </div>
        </Card>

        {/* Scheduled Reminders */}
        <Card
          title="Scheduled Reminders"
          description="List of all scheduled collection reminders"
        >
          {scheduledReminders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Invoice ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Stage</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Scheduled At</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledReminders.map((reminder, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs">{reminder.invoiceId}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {reminder.stage}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          reminder.status === 'sent' ? 'bg-green-100 text-green-800' :
                          reminder.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {reminder.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(reminder.scheduledAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          onClick={() => handleGenerateDraft(reminder.invoiceId)}
                          variant="ghost"
                          size="sm"
                        >
                          Generate Draft
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p>No scheduled reminders</p>
              <p className="text-xs mt-1">Trigger a scan to check for new invoices</p>
            </div>
          )}
        </Card>

        {error && (
          <Card title="Error" className="border-red-200 bg-red-50">
            <div className="text-red-700">
              {error.message}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CollectionsPage;