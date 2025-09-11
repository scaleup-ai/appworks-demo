import type { ReactElement, ComponentType } from "react";
import { createBrowserRouter, RouteObject } from "react-router-dom";
import { ErrorBoundaryPage } from "../pages/error/ErrorBoundary.page";
import { LandingPage } from "../pages/main/Landing.page";
// Login and Success pages removed — the app requires Xero auth immediately.
import DashboardPage from "../pages/dashboard/Dashboard.page";
import CollectionsPage from "../pages/collections/Collections.page";
import PaymentsPage from "../pages/payments/Payments.page";
import AuthProtectedRouteLogic from "./logic/AuthProtected.route-logic";
import RedirectHandlerRouteLogic from "./logic/RedirectHandler.route.logic";

// Add any route-level wrapper components here to have them applied to all
// routes automatically. To add a new helper, import it above and append it
// to this array — the wrapper will be applied in array order.
const GLOBAL_ROUTE_WRAPPERS: Array<ComponentType<{ children: ReactElement }>> =
  [RedirectHandlerRouteLogic];

const wrapElement = (
  element: ReactElement | undefined,
  wrappers: Array<ComponentType<{ children: ReactElement }>>
) => {
  if (!element) return undefined;
  return wrappers.reduce<ReactElement>((acc, Wrapper) => {
    return <Wrapper>{acc}</Wrapper>;
  }, element);
};

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
  // Create the base element for this route. If the route needs per-route
  // logic (like auth checks), apply that first to the raw element. Then
  // apply global wrappers around the entire result. This ordering ensures
  // global handlers (e.g., RedirectHandler) mount before auth guards so
  // they can set short-lived state (like session flags) used by guards.
  const originalElement = route.routeObject.element as ReactElement | undefined;

  // Apply per-route logic first
  let elementWithLogic: ReactElement | undefined = originalElement;
  switch (route.logicType) {
    case ROUTE_LOGIC_TYPE.AUTH_CHECK:
      elementWithLogic = (
        <AuthProtectedRouteLogic>
          {originalElement as ReactElement}
        </AuthProtectedRouteLogic>
      );
      break;
    default:
      elementWithLogic = originalElement;
      break;
  }

  // Now apply global wrappers (RedirectHandler, etc.) around the whole
  // element that already contains per-route logic.
  const wrappers = [...GLOBAL_ROUTE_WRAPPERS, ...(route.wrappers ?? [])];
  const wrapped = wrapElement(elementWithLogic, wrappers);

  return {
    ...route.routeObject,
    element: wrapped as ReactElement,
  };
};

export const browserRouter = createBrowserRouter(
  routes.map(applyRouterMiddleware)
);
