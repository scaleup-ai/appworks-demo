import React, { useState } from "react";
import AppLayout from "./App.layout";

const ContentWithChatLayout: React.FC<{
  title?: string;
  children: React.ReactNode;
  chatAppWidget?: React.ReactNode;
}> = ({ title, children, chatAppWidget }) => {
  const [showChat, setShowChat] = useState(false);

  return (
    <AppLayout title={title}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title || "Dashboard"}</h2>
          <button
            onClick={() => setShowChat((s) => !s)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-100 text-sm text-gray-700 hover:bg-gray-200"
          >
            {showChat ? "Hide chat" : "Show chat"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">{children}</div>
          </div>

          <aside
            className={`col-span-1 transition-all ${
              showChat ? "block" : "hidden"
            } lg:block`}
          >
            <div className="bg-white rounded-lg shadow-sm p-4 h-full">
              <h3 className="mb-2 font-semibold">Chat</h3>
              <div className="text-sm text-gray-600">
                {chatAppWidget || (
                  <p>Sorry, chat is not available right now.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContentWithChatLayout;
