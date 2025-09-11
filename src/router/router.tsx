import { ReactElement } from "react";
import { createBrowserRouter, RouteObject } from "react-router-dom";
import { ErrorBoundaryPage } from "../pages/error/ErrorBoundary.page";
import { LandingPage } from "../pages/main/Landing.page";
import LoginPage from "../pages/login/Login.page";
import SuccessPage from "../pages/auth/Success.page";
import DashboardPage from "../pages/dashboard/Dashboard.page";
import CollectionsPage from "../pages/collections/Collections.page";
import PaymentsPage from "../pages/payments/Payments.page";
import AuthProtected from "./logic/AuthProtected.route-logic";

// Use Vite environment variable for the base path. Falls back to '/'.
export const ROOT_PATH = (import.meta.env.BASE_URL as string) || "/";

enum ROUTE_LOGIC_TYPE {
  AUTH_CHECK = "AUTH_CHECK",
}

export interface ExtendedRouteObject {
  hidden?: boolean;
  title: string;
  logicType: ROUTE_LOGIC_TYPE | undefined;
  routeObject: RouteObject;
  category?: string;
}

export const routes: ExtendedRouteObject[] = [
  {
    title: "Home",
    logicType: undefined,
    routeObject: {
      path: `${ROOT_PATH}/`,
      element: <LandingPage />,
      errorElement: <ErrorBoundaryPage />, // Applies to all
    },
  },
  {
    title: "Login",
    logicType: undefined,
    routeObject: {
      path: `${ROOT_PATH}/login`,
      element: <LoginPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Success",
    logicType: ROUTE_LOGIC_TYPE.AUTH_CHECK,
    routeObject: {
      path: `${ROOT_PATH}/success`,
      element: <SuccessPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Dashboard",
    logicType: ROUTE_LOGIC_TYPE.AUTH_CHECK,
    routeObject: {
      path: `${ROOT_PATH}/dashboard`,
      element: <DashboardPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Collections",
    logicType: ROUTE_LOGIC_TYPE.AUTH_CHECK,
    routeObject: {
      path: `${ROOT_PATH}/collections`,
      element: <CollectionsPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
  {
    title: "Payments",
    logicType: ROUTE_LOGIC_TYPE.AUTH_CHECK,
    routeObject: {
      path: `${ROOT_PATH}/payments`,
      element: <PaymentsPage />,
      errorElement: <ErrorBoundaryPage />,
    },
  },
];

const applyRouterMiddleware = (route: ExtendedRouteObject): RouteObject => {
  switch (route.logicType) {
    case ROUTE_LOGIC_TYPE.AUTH_CHECK: {
      return {
        ...route.routeObject,
        element: (
          <AuthProtected>
            {route.routeObject.element as ReactElement}
          </AuthProtected>
        ),
      };
    }
    default:
      return route.routeObject;
  }
};

export const browserRouter = createBrowserRouter(
  routes.map(applyRouterMiddleware)
);
