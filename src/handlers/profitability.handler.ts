import showToast from "../utils/toast";

export function makeHandleAddTimeEntry(
  getNewTimeEntry: () => { projectCode: string; user: string; role: string; hours: string; date: string; billable: boolean; description: string },
  setTimeEntries: (updater: (prev: any[]) => any[]) => void,
  setNewTimeEntry: (v: any) => void,
  setShowTimeEntryForm: (b: boolean) => void,
  loadProfitabilityData: () => Promise<void>
) {
  return async function handleAddTimeEntry() {
    const newTimeEntry = getNewTimeEntry();
    if (!newTimeEntry.projectCode || !newTimeEntry.user || !newTimeEntry.hours) {
      showToast("Please fill in all required fields", { type: "warning" });
      return;
    }

    try {
      const hourlyRateMap: Record<string, number> = {
        "Senior Developer": 120,
        "Junior Developer": 80,
        "Project Manager": 150,
        Designer: 100,
        "QA Engineer": 90,
      };

      const timeEntry = {
        id: Date.now().toString(),
        ...newTimeEntry,
        hours: parseFloat(newTimeEntry.hours as unknown as string),
        hourlyRate: hourlyRateMap[newTimeEntry.role] || 100,
      };

      setTimeEntries((prev) => [timeEntry, ...prev]);

      setNewTimeEntry({
        projectCode: "",
        user: "",
        role: "",
        date: new Date().toISOString().split("T")[0],
        hours: "",
        billable: true,
        description: "",
      });

      setShowTimeEntryForm(false);
      showToast("Time entry added successfully", { type: "success" });
      await loadProfitabilityData();
    } catch (err) {
      console.error("add time entry failed", err);
      showToast("Failed to add time entry", { type: "error" });
    }
  };
}

export function makeHandleGenerateReport(getSummary: () => any, getProjects: () => any[], getTimeEntries: () => any[]) {
  return function handleGenerateReport() {
    const reportData = {
      summary: getSummary(),
      projects: getProjects(),
      timeEntries: getTimeEntries(),
    };
    console.log("Generated profitability report:", reportData);
    showToast("Profitability report generated (check console)", { type: "success" });
  };
}
