import React, { useState, useEffect } from "react";
// no redux selector required for this view
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import showToast from "../../utils/toast";

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
  // no direct xeroConnected usage in this view; keep selector minimal
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

  const loadProfitabilityData = async () => {
    try {
      setLoading(true);

      // No demo fixtures: default to empty lists if no real API is available
      const proj: Project[] = [];
      const entries: TimeEntry[] = [];
      setProjects(proj);
      setTimeEntries(entries);

      // Calculate summary from the loaded (or empty) arrays
      const totalRevenue = proj.reduce((sum, p) => sum + (p.revenueToDate || 0), 0);
      const totalCosts = proj.reduce((sum, p) => sum + (p.costToDate || 0), 0);
      const totalProfit = totalRevenue - totalCosts;
      const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const activeProjects = proj.filter((p) => p.status === "active").length;
      const unbilledHours = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours, 0);

      setSummary({
        totalRevenue,
        totalCosts,
        totalProfit,
        averageMargin,
        activeProjects,
        unbilledHours,
      });
    } catch {
      console.error("Failed to load profitability data");
      showToast("Failed to load profitability data", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimeEntry = async () => {
    if (!newTimeEntry.projectCode || !newTimeEntry.user || !newTimeEntry.hours) {
      showToast("Please fill in all required fields", { type: "warning" });
      return;
    }

    try {
      const timeEntry: TimeEntry = {
        id: Date.now().toString(),
        ...newTimeEntry,
        hours: parseFloat(newTimeEntry.hours),
        hourlyRate: getRoleRate(newTimeEntry.role),
      };

      setTimeEntries((prev) => [timeEntry, ...prev]);

      // Reset form
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

      // Refresh data
      await loadProfitabilityData();
    } catch {
      showToast("Failed to add time entry", { type: "error" });
    }
  };

  const getRoleRate = (role: string): number => {
    const rates: Record<string, number> = {
      "Senior Developer": 120,
      "Junior Developer": 80,
      "Project Manager": 150,
      Designer: 100,
      "QA Engineer": 90,
    };
    return rates[role] || 100;
  };

  const handleGenerateReport = () => {
    // In a real implementation, this would generate and download a report
    const reportData = {
      summary,
      projects,
      timeEntries,
      // Do not synthesize timestamps for reports; let callers add metadata as needed
    };

    console.log("Generated profitability report:", reportData);
    showToast("Profitability report generated (check console)", { type: "success" });
  };

  useEffect(() => {
    loadProfitabilityData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "completed":
        return "text-blue-600 bg-blue-100";
      case "on-hold":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Project Profitability">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Project Profitability"
      actions={
        <div className="flex gap-2">
          <Button onClick={loadProfitabilityData} variant="secondary" size="sm">
            Refresh
          </Button>
          <Button onClick={() => setShowTimeEntryForm(true)} size="sm">
            Add Time Entry
          </Button>
          <Button onClick={handleGenerateReport} variant="secondary" size="sm">
            Generate Report
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-green-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Costs</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalCosts)}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalProfit)}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Margin</p>
              <p className="text-2xl font-bold text-purple-600">{summary.averageMargin.toFixed(1)}%</p>
            </div>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Time Entry Form Modal */}
        {showTimeEntryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add Time Entry</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Code *</label>
                  <select
                    value={newTimeEntry.projectCode}
                    onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, projectCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.code}>
                        {project.code} - {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User *</label>
                  <input
                    type="text"
                    value={newTimeEntry.user}
                    onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, user: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newTimeEntry.role}
                    onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={newTimeEntry.date}
                      onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours *</label>
                    <input
                      type="number"
                      value={newTimeEntry.hours}
                      onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, hours: e.target.value }))}
                      placeholder="8"
                      step="0.25"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newTimeEntry.billable}
                      onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, billable: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Billable</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTimeEntry.description}
                    onChange={(e) => setNewTimeEntry((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Work description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={() => setShowTimeEntryForm(false)} variant="secondary">
                  Cancel
                </Button>
                <Button onClick={handleAddTimeEntry}>Add Entry</Button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Table */}
        <Card title="Project Overview" description="Revenue, costs, and profitability by project">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(project.revenueToDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(project.costToDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(profit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${project.profitMargin >= 20 ? "text-green-600" : project.profitMargin >= 10 ? "text-yellow-600" : "text-red-600"}`}
                        >
                          {project.profitMargin.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(project.lastUpdated).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Time Entries */}
        <Card title="Recent Time Entries" description="Latest time tracking entries">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeEntries.slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.projectCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.user}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(entry.date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.hours}h</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(entry.hours * entry.hourlyRate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.billable ? "text-green-600 bg-green-100" : "text-gray-600 bg-gray-100"
                        }`}
                      >
                        {entry.billable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{entry.description || "-"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {timeEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">No time entries recorded yet</div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfitabilityPage;
