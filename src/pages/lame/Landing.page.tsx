import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAuthenticated } from "../../store/hooks";
import AppLayout from "../layouts/App.layout";
import { ROOT_PATH } from "../../router/router";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(`${(ROOT_PATH || "/").replace(/\/+$|\/$/g, "")}/dashboard`);
    } else {
      // Redirect to auth page if not authenticated
      navigate(`${(ROOT_PATH || "/").replace(/\/+$|\/$/g, "")}/auth`);
    }
  }, [isAuthenticated, navigate]);
  return (
    <AppLayout title="Home">
      <section className="max-w-3xl py-16 mx-auto text-center">
        <h1 className="mb-4 text-4xl font-extrabold text-gray-900">Scaleupai — early preview</h1>
        <p className="mb-8 text-lg text-gray-600">
          Scaleupai is an early preview that connects to your Xero organisation to surface invoices, payments, and
          collections data so you can automate receivables workflows and get a simple dashboard view of cash collection
          activity. Click Connect Xero to start a quick end-to-end flow.
        </p>

        <div className="flex items-center justify-center gap-4">
          {(() => {
            return (
              <button
                onClick={() =>
                  import("../../apis/xero.api").then(({ getXeroAuthUrl, capturePostAuthRedirect }) => {
                    try {
                      capturePostAuthRedirect();
                    } catch {}
                    window.location.href = getXeroAuthUrl();
                  })
                }
                className="inline-block px-6 py-3 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Connect Xero
              </button>
            );
          })()}

          <a
            href="https://developer.xero.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-6 py-3 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Learn about Xero APIs
          </a>
        </div>

        <div className="p-6 mt-12 text-left bg-white rounded shadow-sm">
          <h3 className="mb-2 font-semibold">How it works</h3>
          <ol className="text-sm text-gray-700 list-decimal list-inside">
            <li>Click Connect Xero — you'll be redirected to Xero to consent.</li>
            <li>Xero returns a code to the backend which exchanges it for tokens.</li>
            <li>
              Scaleupai syncs basic accounting data (invoices, payments) and surfaces it in the dashboard so you can
              review collections and payment status.
            </li>
          </ol>
        </div>
      </section>
    </AppLayout>
  );
};

export default LandingPage;
