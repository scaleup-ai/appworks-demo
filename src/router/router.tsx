import { ReactElement } from "react";
import { createBrowserRouter, RouteObject } from "react-router-dom";
import { ErrorBoundaryPage } from "../pages/error/ErrorBoundary.page";
import { LandingPage } from "../pages/main/Landing.page";
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
