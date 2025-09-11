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

  return (
    <div className={className + " flex items-center gap-4"}>
      <Link
        to="/"
        onClick={() => onLinkClick && onLinkClick()}
        className={linkClass}
      >
        Home
      </Link>
      <Link
        to="/dashboard"
        onClick={() => onLinkClick && onLinkClick()}
        className={linkClass}
      >
        Dashboard
      </Link>
      <Link
        to="/collections"
        onClick={() => onLinkClick && onLinkClick()}
        className={linkClass}
      >
        Collections
      </Link>
      <Link
        to="/payments"
        onClick={() => onLinkClick && onLinkClick()}
        className={linkClass}
      >
        Payments
      </Link>

      <button
        onClick={() =>
          import("../apis/xero.api").then(
            ({ getXeroAuthUrl, capturePostAuthRedirect }) => {
              try {
                capturePostAuthRedirect();
              } catch {}
              window.location.href = getXeroAuthUrl();
            }
          )
        }
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
