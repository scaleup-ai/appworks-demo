import React from "react";
import { Link } from "react-router-dom";

interface NavProps {
  className?: string;
  mobile?: boolean;
  onLinkClick?: () => void;
}

const Nav: React.FC<NavProps> = ({
  className = "",
  mobile = false,
  onLinkClick,
}) => {
  const linkClass = mobile ? "block text-sm py-2" : "text-sm px-3";

  const handleLinkClick = () => {
    // single, explicit place to invoke the optional callback
    try {
      onLinkClick?.();
    } catch {}
  };

  const startXeroAuth = async () => {
    try {
      const { getXeroAuthUrl, capturePostAuthRedirect } = await import(
        "../apis/xero.api"
      );
      try {
        capturePostAuthRedirect();
      } catch {}
      window.location.href = getXeroAuthUrl();
    } catch {
      // noop
    }
  };

  return (
    <div className={className + " flex items-center gap-4"}>
      <Link to="/" onClick={handleLinkClick} className={linkClass}>
        Home
      </Link>
      <Link to="/dashboard" onClick={handleLinkClick} className={linkClass}>
        Dashboard
      </Link>
      <Link to="/collections" onClick={handleLinkClick} className={linkClass}>
        Collections
      </Link>
      <Link to="/payments" onClick={handleLinkClick} className={linkClass}>
        Payments
      </Link>
      <Link to="/profitability" onClick={handleLinkClick} className={linkClass}>
        Profitability
      </Link>
      <Link to="/cashflow" onClick={handleLinkClick} className={linkClass}>
        Cash Flow
      </Link>

      <button
        onClick={startXeroAuth}
        className={
          mobile
            ? "text-sm font-medium text-blue-600 mt-2"
            : "text-sm font-medium text-blue-600"
        }
      >
        Sign in
      </button>
    </div>
  );
};

export default Nav;
