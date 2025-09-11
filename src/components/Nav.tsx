import React from "react";
import { Link, useLocation } from "react-router-dom";
import { routes, ROOT_PATH } from "../router/router";

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
  const location = useLocation();

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const navLinkClass = (path: string) =>
    `text-sm transition-colors duration-200 ${
      isActive(path)
        ? "text-blue-600 font-medium"
        : "text-gray-700 hover:text-blue-600"
    }`;

  // Filter out utility routes (like the OAuth callback) and any hidden routes
  const visible = routes.filter((r) => {
    const p = (r.routeObject?.path ?? "").toString();
    if (!p) return false;
    if (p.includes("/xero/oauth2/redirect")) return false;
    if (r.hidden) return false;
    return true;
  });

  return (
    <div className={className}>
      {visible.map((r, idx) => {
        const path = (r.routeObject.path as string) || ROOT_PATH;
        // Skip entries that are clearly not meant for nav
        if (!r.title) return null;
        return (
          <Link
            key={idx}
            to={path}
            onClick={() => onLinkClick && onLinkClick()}
            className={navLinkClass(path)}
          >
            {r.title}
          </Link>
        );
      })}

      {/* Sign in / Connect Xero action (kept in nav for convenience) */}
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
