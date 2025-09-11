import React from "react";
import { Link } from "react-router-dom";
import AppLayout from "../layouts/App.layout";
import { ROOT_PATH } from "../../router/router";

export const LandingPage: React.FC = () => {
  return (
    <AppLayout title="Home">
      <section className="max-w-3xl py-16 mx-auto text-center">
        <h1 className="mb-4 text-4xl font-extrabold text-gray-900">
          Connect Xero in seconds
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          This demo shows a minimal Xero OAuth flow. Click the button below to
          start the authentication process and connect your Xero organisation.
        </p>

        <div className="flex items-center justify-center gap-4">
          {(() => {
            const prefix = (ROOT_PATH || "/").replace(/\/+$/g, "");
            const loginPath = prefix + "/login";
            return (
              <Link
                to={loginPath}
                className="inline-block px-6 py-3 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Connect Xero
              </Link>
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
            <li>
              Click Connect Xero — you'll be redirected to Xero to consent.
            </li>
            <li>
              Xero returns a code to the backend which exchanges it for tokens.
            </li>
            <li>
              The app detects the successful integration and shows the success
              screen.
            </li>
          </ol>
        </div>
      </section>
    </AppLayout>
  );
};

export default LandingPage;
