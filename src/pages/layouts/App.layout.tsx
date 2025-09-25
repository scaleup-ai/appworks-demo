import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Nav from "../../components/Nav.component";
import { useDispatch } from "react-redux";
import { setXeroConnected } from "../../store/slices/auth.slice";
import { getIntegrationStatus } from "../../apis/xero.api";

const AppLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;
    const probe = async () => {
      try {
        const status = await getIntegrationStatus();
        const ok = (status && ((status as any).integrationStatus as any)?.success) === true;
        if (ok && mounted) dispatch(setXeroConnected());
      } catch {
        // ignore
      }
    };
    void probe();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const navLinkClass = (path: string) =>
    `text-sm transition-colors duration-200 ${
      isActive(path) ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"
    }`;

  return (
    <div className="flex flex-col min-h-screen text-gray-900 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 font-bold text-white bg-blue-600 rounded-md">
                  SU
                </div>
                <div className="text-sm font-semibold">Scaleupai</div>
              </Link>
              {title ? <span className="text-sm text-gray-500">— {title}</span> : null}
            </div>

            <nav className="items-center hidden gap-4 md:flex">
              {/* Dynamic nav rendered from routes */}
              <Nav />
            </nav>

            <div className="flex items-center md:hidden">
              <button
                aria-label="Toggle menu"
                onClick={() => setOpen((v) => !v)}
                className="p-2 text-gray-600 rounded-md hover:bg-gray-100"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 text-lg">{open ? "✖" : "☰"}</span>
              </button>
            </div>
          </div>
        </div>

        {open && (
          <div className="bg-white border-t md:hidden">
            <div className="flex flex-col gap-2 px-4 py-3">
              <Nav mobile onLinkClick={() => setOpen(false)} />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full">
        <div className="px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">{children}</div>
      </main>

      <footer className="bg-white border-t">
        <div className="flex flex-col items-center justify-between gap-4 px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8 md:flex-row">
          <div className="text-sm text-gray-600">© {new Date().getFullYear()} Scaleupai</div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
