import { Dispatch } from "react";
import { safeLocalStorageRemove } from "./shared.handler";

export function makeHandleChange<Action = unknown>(dispatch: Dispatch<Action>, selectTenantAction: (v: string | null) => Action) {
  return function handleChange(ev: React.ChangeEvent<HTMLSelectElement>) {
    const val = ev.target.value || null;
    try {
      if (val) {
        try {
          localStorage.setItem("selectedTenantId", val);
        } catch (e) {
          console.warn("Failed to persist selectedTenantId", e);
        }
        const action = selectTenantAction(val);
        dispatch(action as unknown as Action);
      } else {
        safeLocalStorageRemove("selectedTenantId");
        const action = selectTenantAction(null);
        dispatch(action as unknown as Action);
      }
    } catch (e) {
      console.warn("Failed to persist tenant selection", e);
    }
  };
}
