import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import showToast from "../../utils/toast";

interface CashFlowForecast {
  week: number;
  startDate: string;
  endDate: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
  breachRisk: 'low' | 'medium' | 'high';
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
  const [selectedScenario, setSelectedScenario] = useState<string>('base');

  const loadCashFlowData = async () => {
    try {
      setLoading(true);

      // Mock 13-week cash flow forecast
      const mockForecast: CashFlowForecast[] = [];
      let currentBalance = 50000; // Starting balance

      for (let week = 1; week <= 13; week++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + (week - 1) * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        // Mock inflows and outflows with some seasonality
        const baseInflows = 15000 + Math.random() * 10000;
        const baseOutflows = 12000 + Math.random() * 8000;
        
        // Add some seasonality (higher inflows at month end)
        const dayOfMonth = startDate.getDate();
        const monthEndBoost = dayOfMonth > 25 ? 1.3 : 1.0;
        
        const inflows = baseInflows * monthEndBoost;
        const outflows = baseOutflows;
        
        const closingBalance = currentBalance + inflows - outflows;
        
        let breachRisk: 'low' | 'medium' | 'high' = 'low';
        if (closingBalance < 10000) breachRisk = 'high';
        else if (closingBalance < 25000) breachRisk = 'medium';

        mockForecast.push({
          week,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          openingBalance: currentBalance,
          inflows,
          outflows,
          closingBalance,
          breachRisk,
        });

        currentBalance = closingBalance;
      }

      setForecast(mockForecast);

      // Calculate summary
      const totalInflows = mockForecast.reduce((sum, week) => sum + week.inflows, 0);
      const totalOutflows = mockForecast.reduce((sum, week) => sum + week.outflows, 0);
      const breachWeeks = mockForecast.filter(week => week.breachRisk === 'high').length;
      const finalBalance = mockForecast[mockForecast.length - 1]?.closingBalance || 0;
      
      // Calculate runway (weeks until balance hits zero)
      let runway = 13;
      for (let i = 0; i < mockForecast.length; i++) {
        if (mockForecast[i].closingBalance <= 0) {
          runway = i + 1;
          break;
        }
      }

      setSummary({
        currentBalance: 50000,
        projectedBalance13Week: finalBalance,
        totalInflows13Week: totalInflows,
        totalOutflows13Week: totalOutflows,
        breachWeeks,
        runway,
      });

      // Mock scenarios
      const mockScenarios: Scenario[] = [
        {
          id: 'base',
          name: 'Base Case',
          description: 'Current trajectory with existing collection patterns',
          assumptions: {},
          impact: { balanceChange: 0, runwayChange: 0 },
        },
        {
          id: 'improved-collections',
          name: 'Improved Collections',
          description: 'Reduce DSO by 15 days through better collection processes',
          assumptions: { collectionImprovement: 15 },
          impact: { balanceChange: 25000, runwayChange: 3 },
        },
        {
          id: 'payment-delay',
          name: 'Payment Delays',
          description: 'Delay supplier payments by 10 days to preserve cash',
          assumptions: { paymentDelay: 10 },
          impact: { balanceChange: 15000, runwayChange: 2 },
        },
        {
          id: 'new-revenue',
          name: 'New Contract',
          description: 'Land new $50k contract starting week 4',
          assumptions: { newRevenue: 50000 },
          impact: { balanceChange: 50000, runwayChange: 5 },
        },
        {
          id: 'cost-reduction',
          name: 'Cost Reduction',
          description: 'Reduce operational costs by 20%',
          assumptions: { costReduction: 20 },
          impact: { balanceChange: 20000, runwayChange: 4 },
        },
      ];

      setScenarios(mockScenarios);

    } catch (error) {
      console.error('Failed to load cash flow data:', error);
      showToast('Failed to load cash flow data', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecast = async () => {
    showToast('Regenerating 13-week cash flow forecast...', { type: 'info' });
    await loadCashFlowData();
    showToast('Cash flow forecast updated', { type: 'success' });
  };

  const handleExportForecast = () => {
    const exportData = {
      summary,
      forecast,
      scenarios,
      generatedAt: new Date().toISOString(),
      selectedScenario,
    };
    
    console.log('Cash flow forecast export:', exportData);
    showToast('Cash flow forecast exported (check console)', { type: 'success' });
  };

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      showToast(`Viewing ${scenario.name} scenario`, { type: 'info' });
    }
  };

  useEffect(() => {
    loadCashFlowData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!xeroConnected) {
    return (
      <DashboardLayout title="Cash Flow Management">
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
              🔗
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Xero Connection Required</h3>
            <p className="text-gray-600 mb-6">
              Connect your Xero account to access cash flow forecasting and treasury data.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.currentBalance)}</p>
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <div>
              <p className="text-sm font-medium text-gray-600">13-Week Projection</p>
              <p className={`text-2xl font-bold ${summary.projectedBalance13Week >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedScenario === scenario.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleScenarioChange(scenario.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                  <input
                    type="radio"
                    checked={selectedScenario === scenario.id}
                    onChange={() => handleScenarioChange(scenario.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${scenario.impact.balanceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {scenario.impact.balanceChange >= 0 ? '+' : ''}{formatCurrency(scenario.impact.balanceChange)}
                  </span>
                  <span className="text-gray-500">
                    {scenario.impact.runwayChange >= 0 ? '+' : ''}{scenario.impact.runwayChange} weeks
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opening Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inflows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outflows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closing Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <div className={`text-sm font-medium ${week.closingBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(week.closingBalance)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(week.breachRisk)}`}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Key Patterns Detected:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Month-end collections boost average inflows by 30%
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Payroll and rent create predictable outflow spikes
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Collections timing varies by 7-14 days from invoice date
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {summary.breachWeeks > 0 && `${summary.breachWeeks} weeks show cash flow risk`}
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Recommendations:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Implement automated collections reminders to reduce DSO
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">→</span>
                  Negotiate payment terms with key suppliers for flexibility
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">⚠</span>
                  Consider line of credit for weeks with high breach risk
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">📊</span>
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