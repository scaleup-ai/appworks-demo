import type { ReactElement, ComponentType } from "react";
import { createBrowserRouter, RouteObject } from "react-router-dom";
import { ErrorBoundaryPage } from "../pages/error/ErrorBoundary.page";
import { LandingPage } from "../pages/lame/Landing.page";
import XeroAuthPage from "../pages/auth/xero/XeroAuth.page";
import XeroCallback from "../pages/auth/xero/XeroCallback.page";
import GoogleCallback from "../pages/auth/google/GoogleCallback.page";
import TenantSelector from "../components/TenantSelector.component";
import DashboardPage from "../pages/main/Dashboard.page";
import CollectionsPage from "../pages/main/Collections.page";
import PaymentsPage from "../pages/main/Payments.page";
import ProfitabilityPage from "../pages/main/Profitability.page";
import CashFlowPage from "../pages/main/CashFlow.page";
import SettingsPage from "../pages/main/Settings.page";
import AuthProtectedRouteLogic from "./logic/AuthProtected.route-logic";

// Use the Vite BASE_URL directly as the router root. Rely on the environment
// to control the base path — less logic, as requested.
export const ROOT_PATH = import.meta.env.BASE_URL ? import.meta.env.BASE_URL : "";

enum ROUTE_LOGIC_TYPE {
  AUTH_CHECK = "AUTH_CHECK",
  XERO_OAUTH_CALLBACK = "XERO_OAUTH_CALLBACK",
}

export interface ExtendedRouteObject {
  hidden?: boolean;
  title: string;
  logicType?: ROUTE_LOGIC_TYPE;
  // Optional per-route wrappers applied after GLOBAL_ROUTE_WRAPPERS.
  wrappers?: Array<ComponentType<{ children: ReactElement }>>;
  routeObject: RouteObject;
  category?: string;
}

const authRoutes: ExtendedRouteObject[] = [
  // Frontend route used only to mount the OAuth callback handler when the
  // OAuth provider redirects the browser to a frontend callback path such as
  // /xero/oauth2/redirect. This component will handle the OAuth flow completion.
  {
    title: "Xero OAuth Callback Handler",
    logicType: ROUTE_LOGIC_TYPE.XERO_OAUTH_CALLBACK,
    routeObject: {
      path: `/xero/oauth2/redirect/:state?`,
      element: <XeroCallback />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Google OAuth Callback Handler",
    routeObject: {
      path: `/google/oauth2/redirect/:state?`,
      element: <GoogleCallback />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
];

/**
 * Routes that do not require authentication.
 */
export const lameRoutes: ExtendedRouteObject[] = [
  {
    title: "Home",
    routeObject: {
      path: ROOT_PATH,
      element: <LandingPage />,
      errorElement: <ErrorBoundaryPage />, // Applies to all
    },
  },
  {
    title: "Auth",
    routeObject: {
      path: `/auth`,
      element: <XeroAuthPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Select Tenant",
    routeObject: {
      path: `/select-tenant`,
      element: <TenantSelector />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
];

export const mainAppRoutes: ExtendedRouteObject[] = [
  {
    title: "Dashboard",
    routeObject: {
      path: `/dashboard`,
      element: <DashboardPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Collections",
    routeObject: {
      path: `/collections`,
      element: <CollectionsPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Payments",
    routeObject: {
      path: `/payments`,
      element: <PaymentsPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Profitability",
    routeObject: {
      path: `/profitability`,
      element: <ProfitabilityPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Cash Flow",
    routeObject: {
      path: `/cashflow`,
      element: <CashFlowPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Settings",
    routeObject: {
      path: `/settings`,
      element: <SettingsPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
];

const normalizeSlashesAndConcatArray = (parts: string[]): string => {
  return parts.join("/").replace(/\/+/g, "/");
};

// Helper to produce a path under /app. Accepts leading/trailing slashes and
// normalizes duplicates: appPath('/dashboard') -> '/app/dashboard'
export const appPath = (route: string): string => {
  const r = String(route || "");
  const normalized = r.startsWith("/") ? r : "/" + r;
  // Ensure we include the router's ROOT_PATH so navigation targets match
  // the paths registered when we compose routes (which include ROOT_PATH).
  return normalizeSlashesAndConcatArray([ROOT_PATH, "/app", normalized]);
};

// Compose the final routes list: utility routes first (so callback is mounted),
// then the main app routes.
export const routes: ExtendedRouteObject[] = [
  ...authRoutes.map((r) => ({
    ...r,
    routeObject: {
      ...r.routeObject,
      path: normalizeSlashesAndConcatArray([ROOT_PATH, r.routeObject.path!]),
    },
  })),
  ...lameRoutes.map((r) => ({
    ...r,
    routeObject: {
      ...r.routeObject,
      path: normalizeSlashesAndConcatArray([ROOT_PATH, r.routeObject.path!]),
    },
    logicType: undefined,
  })),
  ...mainAppRoutes.map((r) => ({
    ...r,
    routeObject: {
      ...r.routeObject,
      path: normalizeSlashesAndConcatArray([ROOT_PATH, "/app", r.routeObject.path!]),
    },
    logicType: ROUTE_LOGIC_TYPE.AUTH_CHECK,
  })),
];

const applyLogicWrapper = (route: ExtendedRouteObject): RouteObject => {
  // Only apply AuthProtectedRouteLogic for AUTH_CHECK routes
  const wrappers: Array<ComponentType<{ children: ReactElement }>> = [];
  if (route.logicType === ROUTE_LOGIC_TYPE.AUTH_CHECK) {
    wrappers.push(AuthProtectedRouteLogic);
  }
  if (route.wrappers && route.wrappers.length) wrappers.push(...route.wrappers);
  const wrapped = wrappers.reduceRight<ReactElement>(
    (acc, W) => <W>{acc}</W>,
    route.routeObject.element as ReactElement
  );
  return { ...route.routeObject, element: wrapped };
};

// Print registered route paths in dev to help debug mismatches between
// navigation targets and registered router paths.
try {
  if (import.meta.env && (import.meta.env.DEV as boolean)) {
    // map to the final RouteObject paths
    // eslint-disable-next-line no-console
    console.log(
      "registered routes:",
      routes.map((r) => {
        try {
          return (r.routeObject && (r.routeObject.path as string)) || undefined;
        } catch {
          return undefined;
        }
      })
    );
  }
} catch {}

export const browserRouter = createBrowserRouter(routes.map(applyLogicWrapper));
