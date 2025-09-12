import type { ReactElement, ComponentType } from "react";
import { createBrowserRouter, RouteObject, Outlet } from "react-router-dom";
import { ErrorBoundaryPage } from "../pages/error/ErrorBoundary.page";
import { LandingPage } from "../pages/main/Landing.page";
// Login and Success pages removed — the app requires Xero auth immediately.
import DashboardPage from "../pages/dashboard/Dashboard.page";
import CollectionsPage from "../pages/collections/Collections.page";
import PaymentsPage from "../pages/payments/Payments.page";
import AuthProtectedRouteLogic from "./logic/AuthProtected.route-logic";
import RedirectHandlerRouteLogic from "./logic/RedirectHandler.route-logic";

// Use the Vite BASE_URL directly as the router root. Rely on the environment
// to control the base path — less logic, as requested.
export const ROOT_PATH = (import.meta.env.BASE_URL as string) || "/";

enum ROUTE_LOGIC_TYPE {
  AUTH_CHECK = "AUTH_CHECK",
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
  // Frontend route used only to mount the global RedirectHandler when the
  // OAuth provider redirects the browser to a frontend callback path such as
  // /xero/oauth2/redirect. The element can be empty because the handler will
  // immediately process the URL and navigate away.
  {
    title: "Xero OAuth Callback Handler",
    logicType: undefined,
    routeObject: {
      path: `${ROOT_PATH}/xero/oauth2/redirect`,
      element: <div />,
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
];

export const mainAppRoutes: ExtendedRouteObject[] = [
  {
    title: "Dashboard",
    routeObject: {
      path: `${ROOT_PATH}/dashboard`,
      element: <DashboardPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Collections",
    routeObject: {
      path: `${ROOT_PATH}/collections`,
      element: <CollectionsPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Payments",
    routeObject: {
      path: `${ROOT_PATH}/payments`,
      element: <PaymentsPage />,
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

const applyRouterMiddleware = (route: ExtendedRouteObject): RouteObject => {
  const original = route.routeObject.element as ReactElement | undefined;

  const withLogic =
    route.logicType === ROUTE_LOGIC_TYPE.AUTH_CHECK ? (
      <AuthProtectedRouteLogic>
        {original as ReactElement}
      </AuthProtectedRouteLogic>
    ) : (
      original
    );

  const wrappers: Array<ComponentType<{ children: ReactElement }>> = [
    RedirectHandlerRouteLogic,
    ...(route.wrappers ?? []),
  ];

  const wrapped = withLogic
    ? wrappers.reduce<ReactElement>(
        (acc, W) => <W>{acc}</W>,
        withLogic as ReactElement
      )
    : undefined;

  return { ...route.routeObject, element: wrapped as ReactElement };
};

export const browserRouter = createBrowserRouter(
  routes.map(applyRouterMiddleware)
);
