import showToast from "../utils/toast";

export function makeHandleGenerateForecast(loadCashFlowData: () => Promise<void>) {
  return async function handleGenerateForecast() {
    showToast("Regenerating 13-week cash flow forecast...", { type: "info" });
    await loadCashFlowData();
    showToast("Cash flow forecast updated", { type: "success" });
  };
}

export function makeHandleExportForecast(getExportData: () => any) {
  return function handleExportForecast() {
    const exportData = getExportData();
    console.log("Cash flow forecast export:", exportData);
    showToast("Cash flow forecast exported (check console)", { type: "success" });
  };
}

export function makeHandleScenarioChange(setSelectedScenario: (s: string) => void, scenariosGetter: () => any[], showToastFn = showToast) {
  return function handleScenarioChange(scenarioId: string) {
    setSelectedScenario(scenarioId);
    const scenario = scenariosGetter().find((s) => s.id === scenarioId);
    if (scenario) showToastFn(`Viewing ${scenario.name} scenario`, { type: "info" });
  };
}
