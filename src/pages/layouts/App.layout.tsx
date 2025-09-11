import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const AppLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({
  children,
  title,
}) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinkClass = (path: string) => 
    `text-sm transition-colors duration-200 ${
      isActive(path) 
        ? 'text-blue-600 font-medium' 
        : 'text-gray-700 hover:text-blue-600'
    }`;

  return (
    <div className="flex flex-col min-h-screen text-gray-900 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 font-bold text-white bg-blue-600 rounded-md">
                  AW
                </div>
                <div className="text-sm font-semibold">AppWorks Demo</div>
              </Link>
              {title ? (
                <span className="text-sm text-gray-500">— {title}</span>
              ) : null}
            </div>

            <nav className="items-center hidden gap-4 md:flex">
              <Link
                to="/"
                className={navLinkClass("/")}
              >
                Home
              </Link>
              <Link
                to="/dashboard"
                className={navLinkClass("/dashboard")}
              >
                Dashboard
              </Link>
              <Link
                to="/collections"
                className={navLinkClass("/collections")}
              >
                Collections
              </Link>
              <Link
                to="/payments"
                className={navLinkClass("/payments")}
              >
                Payments
              </Link>
              <Link to="/login" className="text-sm font-medium text-blue-600">
                Sign in
              </Link>
            </nav>

            <div className="flex items-center md:hidden">
              <button
                aria-label="Toggle menu"
                onClick={() => setOpen((v) => !v)}
                className="p-2 text-gray-600 rounded-md hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
                    }
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="bg-white border-t md:hidden">
            <div className="flex flex-col gap-2 px-4 py-3">
              <Link to="/" className={navLinkClass("/")}>
                Home
              </Link>
              <Link to="/dashboard" className={navLinkClass("/dashboard")}>
                Dashboard
              </Link>
              <Link to="/collections" className={navLinkClass("/collections")}>
                Collections
              </Link>
              <Link to="/payments" className={navLinkClass("/payments")}>
                Payments
              </Link>
              <Link to="/login" className="text-sm font-medium text-blue-600">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full">
        <div className="px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t">
        <div className="flex flex-col items-center justify-between gap-4 px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8 md:flex-row">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} AppWorks Demo
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/privacy" className="text-gray-600 hover:text-gray-900">
              Privacy
            </Link>
            <Link to="/terms" className="text-gray-600 hover:text-gray-900">
              Terms
            </Link>
            <a
              href="https://github.com/scaleup-ai/appworks-demo"
              target="_blank"
              rel="noreferrer"
              className="text-gray-600 hover:text-gray-900"
            >
              Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
