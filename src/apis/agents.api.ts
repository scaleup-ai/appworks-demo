import axiosClient from "./axios-client";

export interface AgentStatus {
  name: string;
  status: "active" | "inactive" | "error";
  lastRun?: string;
  description: string;
}

export async function listAgents(): Promise<AgentStatus[]> {
  // Replace with your backend endpoint
  const resp = await axiosClient.get<AgentStatus[]>("/api/v1/agents/status");
  return resp.data;
}
