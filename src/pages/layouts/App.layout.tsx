import React from "react";

const AppLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({
  children,
  title,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="bg-white border-b py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            AppWorks Demo{title ? ` — ${title}` : ""}
          </h1>
          <nav>
            <a
              className="text-sm text-blue-600 hover:underline mr-4"
              href="/cheonglol/"
            >
              Home
            </a>
            <a
              className="text-sm text-blue-600 hover:underline"
              href="/cheonglol/blog"
            >
              Blog
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>

      <footer className="bg-white border-t py-4">
        <div className="container mx-auto px-4 text-sm text-gray-600">
          © {new Date().getFullYear()} AppWorks Demo
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
