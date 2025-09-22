import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useXeroConnected, useSelectedTenantId } from "../../store/hooks";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import showToast from "../../utils/toast";
import {
  loadPaymentData,
  handleTestPaymentReconciliation,
  handleRunBulkReconciliation,
} from "../../handlers/payments.handler";

interface PaymentReconciliationTest {
  id: string;
  paymentId: string;
  amount: number;
  reference?: string;
  result?: {
    matched: boolean;
    invoiceId?: string;
  };
  timestamp: string;
  status: "pending" | "completed" | "failed";
}

interface PaymentSummary {
  totalProcessed: number;
  matchedPayments: number;
  unmatchedPayments: number;
  totalAmount: number;
}

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const xeroConnected = useXeroConnected();
  const selectedTenantId = useSelectedTenantId();
  const [reconciliationTests, setReconciliationTests] = useState<PaymentReconciliationTest[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalProcessed: 0,
    matchedPayments: 0,
    unmatchedPayments: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [testingPayment, setTestingPayment] = useState(false);

  // Test payment form state
  const [testPayment, setTestPayment] = useState({
    paymentId: "",
    amount: "",
    reference: "",
  });

  const loadPaymentDataHandler = () => loadPaymentData(setReconciliationTests, setSummary, setLoading);
  const handleTestPaymentReconciliationHandler = () =>
    handleTestPaymentReconciliation(
      testPayment,
      setTestingPayment,
      setReconciliationTests,
      setTestPayment,
      loadPaymentDataHandler
    );
  const handleRunBulkReconciliationHandler = () =>
    handleRunBulkReconciliation(selectedTenantId, setReconciliationTests, showToast, loadPaymentDataHandler);

  useEffect(() => {
    if (!selectedTenantId) {
      navigate("/select-tenant", { replace: true });
      return;
    }
    loadPaymentDataHandler();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: PaymentReconciliationTest["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (!xeroConnected) {
    return (
      <DashboardLayout title="Payments">
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
              🔗
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Xero Connection Required</h3>
            <p className="text-gray-600 mb-6">Connect your Xero account to access payment reconciliation features.</p>
            <Button onClick={() => navigate("/auth", { replace: true })}>Connect Xero</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Payment Reconciliation"
      actions={
        <div className="flex gap-2">
          <Button onClick={loadPaymentDataHandler} variant="secondary" size="sm">
            Refresh
          </Button>
          <Button onClick={handleRunBulkReconciliationHandler} size="sm">
            Bulk Reconcile
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Processed</p>
              <p className="text-2xl font-bold text-blue-600">{summary.totalProcessed}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Matched Payments</p>
              <p className="text-2xl font-bold text-green-600">{summary.matchedPayments}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Unmatched Payments</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.unmatchedPayments}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalAmount)}</p>
            </div>
          </Card>
        </div>

        {/* Test Payment Reconciliation */}
        <Card title="Test Payment Reconciliation" description="Test the Payment Reconciliation Agent">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTestPaymentReconciliationHandler();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment ID</label>
                <input
                  type="text"
                  value={testPayment.paymentId}
                  onChange={(e) => setTestPayment((prev) => ({ ...prev, paymentId: e.target.value }))}
                  placeholder="PAY-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={testPayment.amount}
                  onChange={(e) => setTestPayment((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="1500.00"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
                <input
                  type="text"
                  value={testPayment.reference}
                  onChange={(e) => setTestPayment((prev) => ({ ...prev, reference: e.target.value }))}
                  placeholder="INV-001 or description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleTestPaymentReconciliationHandler} loading={testingPayment} className="w-full">
                  Test Reconciliation
                </Button>
              </div>
            </div>
          </form>
          <div className="text-sm text-gray-600">
            <p>The Payment Reconciliation Agent will attempt to match this payment to existing invoices based on:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Exact reference match to invoice number</li>
              <li>Amount matching with invoice total</li>
              <li>Fuzzy matching on payment description</li>
            </ul>
          </div>
        </Card>

        {/* Reconciliation History */}
        <Card title="Reconciliation History" description="Recent payment reconciliation attempts">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matched Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reconciliationTests.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{test.paymentId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(test.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{test.reference || "-"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {test.result ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              test.result.matched ? "text-green-600 bg-green-100" : "text-yellow-600 bg-yellow-100"
                            }`}
                          >
                            {test.result.matched ? "Matched" : "Unmatched"}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{test.result?.invoiceId || "-"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(test.status)}`}
                        >
                          {test.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{new Date(test.timestamp).toLocaleString()}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reconciliationTests.length === 0 && (
                <div className="text-center py-8 text-gray-500">No reconciliation tests performed yet</div>
              )}
            </div>
          )}
        </Card>

        {/* Agent Information */}
        <Card title="Payment Reconciliation Agent" description="How the agent works">
          <div className="prose prose-sm max-w-none">
            <h4 className="font-semibold text-gray-900 mb-2">Reconciliation Process:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                <strong>Reference Matching:</strong> First attempts to match payment reference to invoice numbers
              </li>
              <li>
                <strong>Amount Matching:</strong> Looks for invoices with matching amounts
              </li>
              <li>
                <strong>Fuzzy Matching:</strong> Uses description keywords to find potential matches
              </li>
              <li>
                <strong>Partial Payments:</strong> Handles partial payments and suggests allocations
              </li>
              <li>
                <strong>Unmatched Handling:</strong> Creates cases for manual review when no match is found
              </li>
            </ol>

            <h4 className="font-semibold text-gray-900 mb-2 mt-4">Integration Points:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Receives payment data from Xero bank feeds</li>
              <li>Accesses invoice data from the Data Integration Agent</li>
              <li>Triggers follow-up emails via Collections and Email Copywriter Agents</li>
              <li>Updates invoice statuses when matches are confirmed</li>
            </ul>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentsPage;
