import { Dispatch } from "react";

export function makeHandleChange<Action = unknown>(dispatch: Dispatch<Action>, selectTenantAction: (v: string | null) => Action) {
  return function handleChange(ev: React.ChangeEvent<HTMLSelectElement>) {
    const val = ev.target.value || null;
    try {
      if (val) {
        localStorage.setItem("selectedTenantId", val);
        const action = selectTenantAction(val);
        dispatch(action as unknown as Action);
      } else {
        localStorage.removeItem("selectedTenantId");
        const action = selectTenantAction(null);
        dispatch(action as unknown as Action);
      }
    } catch (e) {
      console.warn("Failed to persist tenant selection", e);
    }
  };
}
