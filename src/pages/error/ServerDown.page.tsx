import React from "react";

const ServerDownPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl text-center p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-semibold mb-4">Service temporarily unavailable</h1>
        <p className="mb-4 text-gray-700">
          We're having trouble connecting to our servers. Please try again shortly. You can keep this tab open; we'll
          try to reconnect automatically.
        </p>
        <p className="text-sm text-gray-500">If this persists, contact support or check our status page.</p>
      </div>
    </div>
  );
};

export default ServerDownPage;
