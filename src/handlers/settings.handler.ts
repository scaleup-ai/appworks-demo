import { Dispatch } from "react";

export function makeHandleChange(dispatch: Dispatch<any>, selectTenantAction: (v: any) => any) {
  return function handleChange(ev: React.ChangeEvent<HTMLSelectElement>) {
    const val = ev.target.value || null;
    try {
      if (val) {
        localStorage.setItem("selectedTenantId", val);
        dispatch(selectTenantAction(val));
      } else {
        localStorage.removeItem("selectedTenantId");
        dispatch(selectTenantAction(null));
      }
    } catch (e) {
      console.warn("Failed to persist tenant selection", e);
    }
  };
}
