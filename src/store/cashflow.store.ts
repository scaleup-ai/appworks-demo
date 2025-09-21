import { create } from "zustand";

export interface CashFlowForecast {
  week: number;
  startDate: string;
  endDate: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
  breachRisk: "low" | "medium" | "high";
}

export interface CashFlowSummary {
  currentBalance: number;
  projectedBalance13Week: number;
  totalInflows13Week: number;
  totalOutflows13Week: number;
  breachWeeks: number;
  runway: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  assumptions: {
    collectionImprovement?: number;
    paymentDelay?: number;
    newRevenue?: number;
    costReduction?: number;
  };
  impact: {
    balanceChange: number;
    runwayChange: number;
  };
}

export interface CashFlowState {
  forecast: CashFlowForecast[];
  summary: CashFlowSummary;
  scenarios: Scenario[];
  loading: boolean;
  selectedScenario: string;
  loadCashFlowData: () => Promise<void>;
  setSelectedScenario: (id: string) => void;
}

export const useCashFlowStore = create<CashFlowState>((set) => ({
  forecast: [],
  summary: {
    currentBalance: 0,
    projectedBalance13Week: 0,
    totalInflows13Week: 0,
    totalOutflows13Week: 0,
    breachWeeks: 0,
    runway: 0,
  },
  scenarios: [],
  loading: false,
  selectedScenario: "base",
  loadCashFlowData: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/v1/cashflow");
      if (!res.ok) throw new Error("Failed to fetch cash flow data");
      const data = await res.json();
      set({
        forecast: data.forecast || [],
        summary: data.summary || {
          currentBalance: 0,
          projectedBalance13Week: 0,
          totalInflows13Week: 0,
          totalOutflows13Week: 0,
          breachWeeks: 0,
          runway: 0,
        },
        scenarios: data.scenarios || [],
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      // Optionally: add error state
    }
  },
  setSelectedScenario: (id: string) => set({ selectedScenario: id }),
}));
