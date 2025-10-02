import axiosClient from "./axios-client";
import BACKEND_ROUTES from '../router/backend.routes';

export interface AgentStatus {
  name: string;
  status: "active" | "inactive" | "error";
  lastRun?: string;
  description: string;
}

export async function listAgents(): Promise<AgentStatus[]> {
  // Replace with your backend endpoint
  const url = BACKEND_ROUTES?.agents?.status || "/api/v1/agents/status";
  const resp = await axiosClient.get<AgentStatus[]>(url);
  return resp.data;
}
