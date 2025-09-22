import React, { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAuthenticated } from "../../store/hooks";
import { useAuthStore } from "../../store/auth.store";

interface AuthProtectedRouteLogicProps {
  children: ReactElement;
}

const AuthProtectedRouteLogic: React.FC<AuthProtectedRouteLogicProps> = ({ children }) => {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  // Zustand hydration check
  const [hydrated, setHydrated] = useState(false);
  const store = useAuthStore();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      navigate("/auth");
    }
  }, [hydrated, isAuthenticated, navigate]);

  if (!hydrated) {
    return null;
  }
  if (!isAuthenticated) {
    return null;
  }
  return children;
};

export default AuthProtectedRouteLogic;
