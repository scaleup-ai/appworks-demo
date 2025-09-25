import { Dispatch } from "react";
import { AuthStorage } from "../store/slices/auth.slice";

export function makeHandleChange<Action = unknown>(dispatch: Dispatch<Action>, selectTenantAction: (v: string | null) => Action) {
  return function handleChange(ev: React.ChangeEvent<HTMLSelectElement>) {
    const val = ev.target.value || null;
    try {
      if (val) {
        try {
          AuthStorage.setSelectedTenantId(val);
        } catch {
          console.warn("Failed to persist selectedTenantId");
        }
        const action = selectTenantAction(val);
        dispatch(action as unknown as Action);
      } else {
        try {
          AuthStorage.setSelectedTenantId(null);
        } catch (e) {
          // ignore
        }
        const action = selectTenantAction(null);
        dispatch(action as unknown as Action);
      }
    } catch (e) {
      console.warn("Failed to persist tenant selection", e);
    }
  };
}
