import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card.component";
import Button from "../../components/ui/Button.component";
import LoadingSpinner from "../../components/ui/LoadingSpinner.component";
import showToast from "../../utils/toast";
import ActionBar from "../../components/ui/ActionBar.component";
import StatusBadge from "../../components/ui/StatusBadge.component";
import { formatCurrency } from "../../helpers/ui.helper";
import SummaryCardGrid from "../../components/ui/SummaryCardGrid.component";

// Interfaces are defined in-file as this page is a self-contained demo
interface Project {
  id: string;
  code: string;
  name: string;
  revenueToDate: number;
  costToDate: number;
  profitMargin: number;
  status: "active" | "completed" | "on-hold";
  lastUpdated: string;
}

interface TimeEntry {
  id: string;
  projectCode: string;
  user: string;
  role: string;
  date: string;
  hours: number;
  billable: boolean;
  description: string;
  hourlyRate: number;
}

interface ProfitabilitySummary {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  averageMargin: number;
  activeProjects: number;
  unbilledHours: number;
}

const ProfitabilityPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<ProfitabilitySummary>({
    totalRevenue: 0,
    totalCosts: 0,
    totalProfit: 0,
    averageMargin: 0,
    activeProjects: 0,
    unbilledHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [newTimeEntry, setNewTimeEntry] = useState({
    projectCode: "",
    user: "",
    role: "",
    date: new Date().toISOString().split("T")[0],
    hours: "",
    billable: true,
    description: "",
  });

  const loadProfitabilityData = useCallback(async () => {
    setLoading(true);
    // Using mock data as no API is available for this page
    const proj: Project[] = [];
    const entries: TimeEntry[] = [];
    setProjects(proj);
    setTimeEntries(entries);

    const totalRevenue = proj.reduce((sum, p) => sum + p.revenueToDate, 0);
    const totalCosts = proj.reduce((sum, p) => sum + p.costToDate, 0);
    const totalProfit = totalRevenue - totalCosts;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const activeProjects = proj.filter((p) => p.status === "active").length;
    const unbilledHours = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours, 0);

    setSummary({ totalRevenue, totalCosts, totalProfit, averageMargin, activeProjects, unbilledHours });
    setLoading(false);
  }, []);

  const handleAddTimeEntry = async () => {
    if (!newTimeEntry.projectCode || !newTimeEntry.user || !newTimeEntry.hours) {
      showToast("Please fill in all required fields", { type: "warning" });
      return;
    }

    const hourlyRateMap: Record<string, number> = {
      "Senior Developer": 120,
      "Junior Developer": 80,
      "Project Manager": 150,
      Designer: 100,
      "QA Engineer": 90,
    };

    const timeEntry: TimeEntry = {
      id: Date.now().toString(),
      ...newTimeEntry,
      hours: parseFloat(newTimeEntry.hours),
      hourlyRate: hourlyRateMap[newTimeEntry.role] || 100,
    };

    setTimeEntries((prev) => [timeEntry, ...prev]);
    setNewTimeEntry({
      projectCode: "", user: "", role: "", date: new Date().toISOString().split("T")[0],
      hours: "", billable: true, description: "",
    });
    setShowTimeEntryForm(false);
    showToast("Time entry added successfully", { type: "success" });
    await loadProfitabilityData();
  };

  const handleGenerateReport = () => {
    const reportData = { summary, projects, timeEntries };
    console.log("Generated profitability report:", reportData);
    showToast("Profitability report generated (check console)", { type: "success" });
  };

  useEffect(() => {
    loadProfitabilityData();
  }, [loadProfitabilityData]);

  if (loading) {
    return (
      <DashboardLayout title="Project Profitability">
        <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Project Profitability"
      actions={
        <ActionBar>
          <Button onClick={loadProfitabilityData} variant="secondary" size="sm">Refresh</Button>
          <Button onClick={() => setShowTimeEntryForm(true)} size="sm">Add Time Entry</Button>
          <Button onClick={handleGenerateReport} variant="secondary" size="sm">Generate Report</Button>
        </ActionBar>
      }
    >
      <div className="space-y-6">
        <SummaryCardGrid
          items={[
            { title: "Total Revenue", value: formatCurrency(summary.totalRevenue), className: "border-l-4 border-l-green-500" },
            { title: "Total Costs", value: formatCurrency(summary.totalCosts), className: "border-l-4 border-l-red-500" },
            { title: "Total Profit", value: formatCurrency(summary.totalProfit), className: "border-l-4 border-l-blue-500" },
            { title: "Average Margin", value: `${summary.averageMargin.toFixed(1)}%`, className: "border-l-4 border-l-purple-500" },
          ]}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-l-4 border-l-orange-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-orange-600">{summary.activeProjects}</p>
            </div>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Unbilled Hours</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.unbilledHours}</p>
            </div>
          </Card>
        </div>

        {showTimeEntryForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md p-6 bg-white rounded-lg">
              <h3 className="mb-4 text-lg font-semibold">Add Time Entry</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Project Code *</label>
                  <select value={newTimeEntry.projectCode} onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, projectCode: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select project</option>
                    {projects.map((project) => (<option key={project.id} value={project.code}>{project.code} - {project.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">User *</label>
                  <input type="text" value={newTimeEntry.user} onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, user: e.target.value }))} placeholder="John Doe" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Role</label>
                  <select value={newTimeEntry.role} onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select role</option>
                    <option value="Senior Developer">Senior Developer ($120/hr)</option>
                    <option value="Junior Developer">Junior Developer ($80/hr)</option>
                    <option value="Project Manager">Project Manager ($150/hr)</option>
                    <option value="Designer">Designer ($100/hr)</option>
                    <option value="QA Engineer">QA Engineer ($90/hr)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Date *</label>
                    <input type="date" value={newTimeEntry.date} onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Hours *</label>
                    <input type="number" value={newTimeEntry.hours} onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, hours: e.target.value }))} placeholder="8" step="0.25" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" checked={newTimeEntry.billable} onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, billable: e.target.checked }))} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700">Billable</span>
                  </label>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Description</label>
                  <textarea value={newTimeEntry.description} onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, description: e.target.value }))} placeholder="Work description..." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={() => setShowTimeEntryForm(false)} variant="secondary">Cancel</Button>
                <Button onClick={handleAddTimeEntry}>Add Entry</Button>
              </div>
            </div>
          </div>
        )}

        <Card title="Project Overview" description="Revenue, costs, and profitability by project">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Costs</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Profit</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Margin</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => {
                  const profit = project.revenueToDate - project.costToDate;
                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{project.code}</div>
                          <div className="text-sm text-gray-500">{project.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{formatCurrency(project.revenueToDate)}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{formatCurrency(project.costToDate)}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className={`text-sm font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(profit)}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className={`text-sm font-medium ${project.profitMargin >= 20 ? "text-green-600" : project.profitMargin >= 10 ? "text-yellow-600" : "text-red-600"}`}>{project.profitMargin.toFixed(1)}%</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge variant={project.status === "active" ? "green" : project.status === "completed" ? "blue" : "yellow"}>{project.status}</StatusBadge></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{new Date(project.lastUpdated).toLocaleDateString()}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Recent Time Entries" description="Latest time tracking entries">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Hours</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Billable</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeEntries.slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{entry.projectCode}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{entry.user}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{entry.role}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{new Date(entry.date).toLocaleDateString()}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{entry.hours}h</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{formatCurrency(entry.hours * entry.hourlyRate)}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge variant={entry.billable ? "green" : "gray"}>{entry.billable ? "Yes" : "No"}</StatusBadge></td>
                    <td className="px-6 py-4"><div className="max-w-xs text-sm text-gray-900 truncate">{entry.description || "-"}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {timeEntries.length === 0 && (<div className="py-8 text-center text-gray-500">No time entries recorded yet</div>)}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfitabilityPage;