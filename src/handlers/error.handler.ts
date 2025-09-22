import { NavigateFunction } from "react-router-dom";

export function makeHandleGoHome(navigate: NavigateFunction) {
  return function handleGoHome() {
    navigate("/", { replace: true });
  };
}

export function makeHandleGoBack(navigate: NavigateFunction) {
  return function handleGoBack() {
    navigate(-1);
  };
}
