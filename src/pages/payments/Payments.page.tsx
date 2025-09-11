import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { reconcilePaymentStart } from "../../store/slices/payment.slice";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import showToast from "../../utils/toast";

const PaymentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, reconciliationResults, error } = useSelector(
    (state: RootState) => state.payment
  );

  const [paymentForm, setPaymentForm] = useState({
    paymentId: "",
    amount: "",
    reference: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReconcilePayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentForm.paymentId || !paymentForm.amount) {
      showToast("Payment ID and amount are required", { type: "error" });
      return;
    }

    dispatch(
      reconcilePaymentStart({
        paymentId: paymentForm.paymentId,
        amount: parseFloat(paymentForm.amount),
        reference: paymentForm.reference || undefined,
        onSuccess: (result: any) => {
          showToast(
            result.matched
              ? `Payment matched to invoice ${result.invoiceId}`
              : "Payment could not be matched automatically",
            { type: result.matched ? "success" : "warning" }
          );
          setPaymentForm({ paymentId: "", amount: "", reference: "" });
        },
        onError: (error: any) =>
          showToast(`Failed to reconcile payment: ${error.message}`, {
            type: "error",
          }),
      })
    );
  };

  return (
    <DashboardLayout
      title="Payment Reconciliation"
      sidebar={
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Reconcile Payment</h3>
          <form onSubmit={handleReconcilePayment} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment ID *
              </label>
              <input
                type="text"
                name="paymentId"
                value={paymentForm.paymentId}
                onChange={handleInputChange}
                placeholder="Enter payment ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                type="number"
                name="amount"
                value={paymentForm.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference
              </label>
              <input
                type="text"
                name="reference"
                value={paymentForm.reference}
                onChange={handleInputChange}
                placeholder="Payment reference"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              type="submit"
              loading={isLoading}
              size="sm"
              className="w-full"
            >
              Reconcile Payment
            </Button>
          </form>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Reconciliation Results */}
        <Card
          title="Reconciliation Results"
          description="Recent payment reconciliation attempts"
        >
          {reconciliationResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Payment ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Matched Invoice
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationResults.map((result, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-mono text-xs">
                        {/* We don't have paymentId in the result, so we'll show index */}
                        Payment #{index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.matched
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {result.matched ? "Matched" : "Unmatched"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {result.invoiceId || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date().toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <p>No reconciliation results</p>
              <p className="text-xs mt-1">Use the form to reconcile payments</p>
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card
          title="How Payment Reconciliation Works"
          description="Understanding the reconciliation process"
        >
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  Enter Payment Details
                </div>
                <div>
                  Provide the payment ID, amount, and optional reference
                  information.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  Automatic Matching
                </div>
                <div>
                  The system attempts to match the payment to outstanding
                  invoices using reference and amount.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </div>
              <div>
                <div className="font-medium text-gray-900">Review Results</div>
                <div>
                  Matched payments are automatically applied. Unmatched payments
                  require manual review.
                </div>
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <Card title="Error" className="border-red-200 bg-red-50">
            <div className="text-red-700">{error.message}</div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PaymentsPage;
