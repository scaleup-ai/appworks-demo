import React from "react";
import AppLayout from "./App.layout";

const ContentWithChatLayout: React.FC<{
  title?: string;
  children: React.ReactNode;
  chatAppWidget?: React.ReactNode;
}> = ({ title, children, chatAppWidget }) => {
  return (
    <AppLayout title={title}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="p-6 bg-white rounded shadow-sm lg:col-span-3">
          {children}
        </div>
        <aside className="hidden p-4 bg-white rounded shadow-sm lg:block">
          <h3 className="mb-2 font-semibold">Chat</h3>
          <div className="text-sm text-gray-600">
            {chatAppWidget || <p>Sorry, chat is not available right now.</p>}
          </div>
        </aside>
      </div>
    </AppLayout>
  );
};

export default ContentWithChatLayout;
