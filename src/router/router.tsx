import type { ReactElement, ComponentType } from "react";
import { createBrowserRouter, RouteObject } from "react-router-dom";
import { ErrorBoundaryPage } from "../pages/error/ErrorBoundary.page";
import { LandingPage } from "../pages/main/Landing.page";
import AuthPage from "../pages/Auth.page";
import XeroCallback from "../pages/XeroCallback.page";
import DashboardPage from "../pages/dashboard/Dashboard.page";
import CollectionsPage from "../pages/collections/Collections.page";
import PaymentsPage from "../pages/payments/Payments.page";
import ProfitabilityPage from "../pages/profitability/Profitability.page";
import CashFlowPage from "../pages/cashflow/CashFlow.page";
import AuthProtectedRouteLogic from "./logic/AuthProtected.route-logic";
import RedirectHandler from "./logic/RedirectHandler.route-logic";

// Use the Vite BASE_URL directly as the router root. Rely on the environment
// to control the base path — less logic, as requested.
export const ROOT_PATH = (import.meta.env.BASE_URL as string) || "/";

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

const utilityRoutes: ExtendedRouteObject[] = [
  // Frontend route used only to mount the OAuth callback handler when the
  // OAuth provider redirects the browser to a frontend callback path such as
  // /xero/oauth2/redirect. This component will handle the OAuth flow completion.
  {
    title: "Xero OAuth Callback Handler",
    logicType: ROUTE_LOGIC_TYPE.XERO_OAUTH_CALLBACK,
    routeObject: {
      path: `${ROOT_PATH}xero/oauth2/redirect/:state?`,
      element: <XeroCallback />,
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
      path: `${ROOT_PATH}auth`,
      element: <AuthPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
];

export const mainAppRoutes: ExtendedRouteObject[] = [
  {
    title: "Dashboard",
    routeObject: {
      path: `${ROOT_PATH}dashboard`,
      element: <DashboardPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Collections",
    routeObject: {
      path: `${ROOT_PATH}collections`,
      element: <CollectionsPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Payments",
    routeObject: {
      path: `${ROOT_PATH}payments`,
      element: <PaymentsPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Profitability",
    routeObject: {
      path: `${ROOT_PATH}profitability`,
      element: <ProfitabilityPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Cash Flow",
    routeObject: {
      path: `${ROOT_PATH}cashflow`,
      element: <CashFlowPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
];

// Compose the final routes list: utility routes first (so callback is mounted),
// then the main app routes.
export const routes: ExtendedRouteObject[] = [
  ...utilityRoutes,
  ...lameRoutes, // Hide lame routes from nav
  ...mainAppRoutes.map((r) => ({
    ...r,
    logicType: ROUTE_LOGIC_TYPE.AUTH_CHECK,
  })),
];

const applyLogicWrapper = (route: ExtendedRouteObject): RouteObject => {
  // Global wrappers applied to all routes
  const globalWrappers: Array<ComponentType<{ children: ReactElement }>> = [RedirectHandler];

  // Compose wrappers simply:
  // - always apply global wrappers
  // - only apply AuthProtectedRouteLogic for AUTH_CHECK routes
  // - never apply the auth wrapper to the XERO OAuth callback route (prevents redirect loop)
  const wrappers: Array<ComponentType<{ children: ReactElement }>> = [...globalWrappers];
  if (route.logicType === ROUTE_LOGIC_TYPE.AUTH_CHECK) {
    wrappers.push(AuthProtectedRouteLogic);
  }

  // Per-route wrappers applied after globals and logic-specific wrappers
  if (route.wrappers && route.wrappers.length) wrappers.push(...route.wrappers);

  // Apply wrappers so that earlier entries in `wrappers` become the outer
  // components. Using reduceRight nests them in that order, which makes
  // global wrappers (added first) wrap the route-specific wrappers.
  const wrapped = wrappers.reduceRight<ReactElement>(
    (acc, W) => <W>{acc}</W>,
    route.routeObject.element as ReactElement
  );

  return { ...route.routeObject, element: wrapped };
};

export const browserRouter = createBrowserRouter(routes.map(applyLogicWrapper));