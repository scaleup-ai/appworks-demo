import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card.component";
import Button from "../../components/ui/Button.component";
import LoadingSpinner from "../../components/ui/LoadingSpinner.component";
import showToast from "../../utils/toast";
import { useNavigate } from "react-router-dom";
import { downloadJson, formatCurrency } from "../../helpers/ui.helper";
import {
  makeHandleGenerateForecast,
  makeHandleExportForecast,
  makeHandleScenarioChange,
} from "../../handlers/forecast.handler";

interface CashFlowForecast {
  week: number;
  startDate: string;
  endDate: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
  breachRisk: "low" | "medium" | "high";
}

interface CashFlowSummary {
  currentBalance: number;
  projectedBalance13Week: number;
  totalInflows13Week: number;
  totalOutflows13Week: number;
  breachWeeks: number;
  runway: number; // weeks
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  assumptions: {
    collectionImprovement?: number; // percentage
    paymentDelay?: number; // days
    newRevenue?: number; // amount
    costReduction?: number; // percentage
  };
  impact: {
    balanceChange: number;
    runwayChange: number;
  };
}

const CashFlowPage: React.FC = () => {
  const navigate = useNavigate();
  const { xeroConnected } = useSelector((state: RootState) => state.auth);
  const [forecast, setForecast] = useState<CashFlowForecast[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary>({
    currentBalance: 0,
    projectedBalance13Week: 0,
    totalInflows13Week: 0,
    totalOutflows13Week: 0,
    breachWeeks: 0,
    runway: 0,
  });
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<string>("base");

  const loadCashFlowData = async () => {
    try {
      setLoading(true);
      // Fetch cash flow data from backend API
      const res = await fetch("/api/v1/cashflow");
      if (!res.ok) throw new Error("Failed to fetch cash flow data");
      const data = await res.json();
      setForecast(data.forecast || []);
      setSummary(
        data.summary || {
          currentBalance: 0,
          projectedBalance13Week: 0,
          totalInflows13Week: 0,
          totalOutflows13Week: 0,
          breachWeeks: 0,
          runway: 0,
        }
      );
      setScenarios(data.scenarios || []);
    } catch (error) {
      console.error("Failed to load cash flow data:", error);
      showToast("Failed to load cash flow data", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecast = makeHandleGenerateForecast(loadCashFlowData);
  const handleExportForecast = makeHandleExportForecast(() => ({
    summary,
    forecast,
    scenarios,
    generatedAt: new Date().toISOString(),
    selectedScenario,
  }));
  const handleScenarioChange = makeHandleScenarioChange(setSelectedScenario, () => scenarios);

  useEffect(() => {
    loadCashFlowData();
  }, []);

  const getRiskColor = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (!xeroConnected) {
    return (
      <DashboardLayout title="Cash Flow Management">
        <Card>
          <div className="py-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 text-2xl bg-yellow-100 rounded-full">
              🔗
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">Xero Connection Required</h3>
            <p className="mb-6 text-gray-600">
              Connect your Xero account to access cash flow forecasting and treasury data.
            </p>
            <Button
              onClick={() => {
                navigate("/connect-xero");
              }}
            >
              Connect Xero
            </Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Cash Flow Management">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Cash Flow Management"
      actions={
        <div className="flex gap-2">
          <Button onClick={loadCashFlowData} variant="secondary" size="sm">
            Refresh
          </Button>
          <Button onClick={handleGenerateForecast} size="sm">
            Regenerate Forecast
          </Button>
          <Button onClick={handleExportForecast} variant="secondary" size="sm">
            Export
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.currentBalance)}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <div>
              <p className="text-sm font-medium text-gray-600">13-Week Projection</p>
              <p
                className={`text-2xl font-bold ${summary.projectedBalance13Week >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(summary.projectedBalance13Week)}
              </p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Runway</p>
              <p className="text-2xl font-bold text-purple-600">{summary.runway} weeks</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Breach Risk Weeks</p>
              <p className="text-2xl font-bold text-red-600">{summary.breachWeeks}</p>
            </div>
          </Card>
        </div>

        {/* Scenario Selector */}
        <Card title="Scenario Analysis" description="Compare different cash flow scenarios">
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedScenario === scenario.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleScenarioChange(scenario.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                  <input
                    type="radio"
                    checked={selectedScenario === scenario.id}
                    onChange={() => handleScenarioChange(scenario.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
                <p className="mb-3 text-sm text-gray-600">{scenario.description}</p>
                <div className="flex justify-between text-sm">
                  <span
                    className={`font-medium ${scenario.impact.balanceChange >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {scenario.impact.balanceChange >= 0 ? "+" : ""}
                    {formatCurrency(scenario.impact.balanceChange)}
                  </span>
                  <span className="text-gray-500">
                    {scenario.impact.runwayChange >= 0 ? "+" : ""}
                    {scenario.impact.runwayChange} weeks
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 13-Week Forecast Table */}
        <Card title="13-Week Cash Flow Forecast" description="Weekly cash flow projections">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Week
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Opening Balance
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Inflows
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Outflows
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Closing Balance
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forecast.map((week) => (
                  <tr key={week.week} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Week {week.week}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(week.startDate).toLocaleDateString()} - {new Date(week.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(week.openingBalance)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">{formatCurrency(week.inflows)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-red-600">({formatCurrency(week.outflows)})</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-medium ${week.closingBalance >= 0 ? "text-gray-900" : "text-red-600"}`}
                      >
                        {formatCurrency(week.closingBalance)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(week.breachRisk)}`}
                      >
                        {week.breachRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Cash Flow Insights */}
        <Card title="Cash Flow Insights" description="Key patterns and recommendations">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 font-semibold text-gray-900">Key Patterns Detected:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-2 h-2 mt-2 mr-3 bg-blue-500 rounded-full"></span>
                  Month-end collections boost average inflows by 30%
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-2 h-2 mt-2 mr-3 bg-yellow-500 rounded-full"></span>
                  Payroll and rent create predictable outflow spikes
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-2 h-2 mt-2 mr-3 bg-green-500 rounded-full"></span>
                  Collections timing varies by 7-14 days from invoice date
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-2 h-2 mt-2 mr-3 bg-red-500 rounded-full"></span>
                  {summary.breachWeeks > 0 && `${summary.breachWeeks} weeks show cash flow risk`}
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 font-semibold text-gray-900">Recommendations:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="mr-2 text-green-600">✓</span>
                  Implement automated collections reminders to reduce DSO
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-600">→</span>
                  Negotiate payment terms with key suppliers for flexibility
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-yellow-600">⚠</span>
                  Consider line of credit for weeks with high breach risk
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-purple-600">📊</span>
                  Monitor collection patterns weekly for early warning signs
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CashFlowPage;
