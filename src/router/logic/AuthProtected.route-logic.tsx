import React, { ReactElement, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ROOT_PATH } from "../../router/router";
import { RootState } from "../../store/store";
import { logout as logoutAction } from "../../store/slices/auth.slice";
import { AuthStorage } from "../../store/slices/auth.slice";

interface AuthProtectedRouteLogicProps {
  children: ReactElement;
}

const AuthProtectedRouteLogic: React.FC<AuthProtectedRouteLogicProps> = ({ children }) => {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const xeroConnected = useSelector((state: RootState) => state.auth.xeroConnected);
  const tenants = useSelector((state: RootState) => state.auth.tenants || []);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`${ROOT_PATH}auth`);
      return;
    }

    // If the user is authenticated and Xero is connected but we detected
    // zero tenants for this user, clear auth state and force them to sign-in.
    // This addresses cases where tenant scoping failed or user has no organisations.
    if (isAuthenticated && xeroConnected && Array.isArray(tenants) && tenants.length === 0) {
      try {
        dispatch(logoutAction());
      } catch (e) {
        // ignore dispatch errors
        // but still clear persisted keys
      }
      try {
        AuthStorage.setSelectedTenantId(null);
        AuthStorage.setIsAuthenticated(false);
      } catch (e) {
        // ignore
      }
      navigate(`${ROOT_PATH}auth`);
      return;
    }
  }, [isAuthenticated, xeroConnected, tenants, dispatch, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return children;
};

export default AuthProtectedRouteLogic;
