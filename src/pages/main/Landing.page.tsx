import React from "react";
import AppLayout from "../layouts/App.layout";

export const LandingPage: React.FC = () => {
  return (
    <AppLayout title="Home">
      <section className="max-w-3xl mx-auto text-center py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Connect Xero in seconds
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          This demo shows a minimal Xero OAuth flow. Click the button below to
          start the authentication process and connect your Xero organisation.
        </p>

        <div className="flex items-center justify-center gap-4">
          <a
            href="/cheonglol/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
          >
            Connect Xero
          </a>

          <a
            href="https://developer.xero.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-6 py-3 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            Learn about Xero APIs
          </a>
        </div>

        <div className="mt-12 text-left bg-white p-6 rounded shadow-sm">
          <h3 className="font-semibold mb-2">How it works</h3>
          <ol className="list-decimal list-inside text-sm text-gray-700">
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
