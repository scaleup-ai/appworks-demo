import showToast from "../utils/toast";

export type NewTimeEntry = { projectCode: string; user: string; role: string; hours: string; date: string; billable: boolean; description: string };
export type TimeEntry = Omit<NewTimeEntry, "hours"> & { id: string; hours: number; hourlyRate: number };

export function makeHandleAddTimeEntry(
  getNewTimeEntry: () => NewTimeEntry,
  setTimeEntries: (updater: (prev: TimeEntry[]) => TimeEntry[]) => void,
  setNewTimeEntry: (v: NewTimeEntry) => void,
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

      const timeEntry: TimeEntry = {
        id: Date.now().toString(),
        projectCode: newTimeEntry.projectCode,
        user: newTimeEntry.user,
        role: newTimeEntry.role,
        date: newTimeEntry.date,
        billable: newTimeEntry.billable,
        description: newTimeEntry.description,
        hours: parseFloat(newTimeEntry.hours),
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

export function makeHandleGenerateReport(getSummary: () => unknown, getProjects: () => unknown[], getTimeEntries: () => TimeEntry[]) {
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
