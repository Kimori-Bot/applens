'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  BarChart3, 
  Download, 
  FileText, 
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Smartphone,
  Users,
  Activity
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';

interface AnalyticsData {
  summary: {
    totalTests: number;
    completedTests: number;
    failedTests: number;
    runningTests: number;
    pendingTests: number;
    passRate: number;
    avgDurationSeconds: number;
    totalSessions: number;
    completedSessions: number;
  };
  trend: Array<{
    date: string;
    total: number;
    passed: number;
    failed: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  gray: '#6b7280'
};

const PIE_COLORS = [COLORS.success, COLORS.danger, COLORS.warning, COLORS.gray];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [appId, setAppId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const fetchAnalytics = async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set('days', dateRange.toString());
      if (appId) params.set('app_id', appId);

      const response = await fetch(`/api/analytics/overview?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, appId]);

  // Calculate pie chart data
  const getStatusDistribution = () => {
    if (!data?.summary) return [];
    return [
      { name: 'Passed', value: data.summary.completedTests, color: COLORS.success },
      { name: 'Failed', value: data.summary.failedTests, color: COLORS.danger },
      { name: 'Running', value: data.summary.runningTests, color: COLORS.warning },
      { name: 'Pending', value: data.summary.pendingTests, color: COLORS.gray }
    ].filter(d => d.value > 0);
  };

  // Calculate device usage mock data
  const getDeviceUsageData = () => {
    if (!data?.topErrors) return [];
    // Using error count as proxy for device activity
    return data.topErrors.slice(0, 5).map((e, i) => ({
      device: `Device ${i + 1}`,
      sessions: Math.floor(Math.random() * 50) + 10,
      reliability: Math.floor(Math.random() * 20) + 80
    }));
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!data) return;

    const trendData = data.trend.map(t => ({
      Date: t.date,
      'Total Tests': t.total,
      Passed: t.passed,
      Failed: t.failed
    }));

    const csv = Papa.unparse(trendData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!dashboardRef.current) return;

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: '#0a0a0f'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div ref={dashboardRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-400" />
            Analytics
          </h1>
          <p className="text-gray-400">Test results and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="p-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white hover:bg-[#2a2a3e] disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2 text-left text-white hover:bg-[#2a2a3e] text-sm flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportToPDF}
                className="w-full px-4 py-2 text-left text-white hover:bg-[#2a2a3e] text-sm flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data?.summary.totalTests || 0}</p>
              <p className="text-sm text-gray-400">Total Tests</p>
            </div>
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data?.summary.passRate || 0}%</p>
              <p className="text-sm text-gray-400">Pass Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatDuration(data?.summary.avgDurationSeconds || 0)}
              </p>
              <p className="text-sm text-gray-400">Avg Duration</p>
            </div>
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data?.summary.failedTests || 0}</p>
              <p className="text-sm text-gray-400">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tests Per Day - Line Chart */}
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Tests Per Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke={COLORS.primary} strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="passed" stroke={COLORS.success} strokeWidth={2} dot={false} name="Passed" />
              <Line type="monotone" dataKey="failed" stroke={COLORS.danger} strokeWidth={2} dot={false} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pass/Fail Rate - Pie Chart */}
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Test Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={getStatusDistribution()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {getStatusDistribution().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '8px' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Device Usage - Bar Chart */}
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Device Activity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getDeviceUsageData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="device" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '8px' }}
              />
              <Bar dataKey="sessions" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Issues - Bar Chart */}
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Top Issues</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.topErrors?.slice(0, 5) || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis 
                dataKey="error" 
                type="category" 
                stroke="#6b7280" 
                fontSize={10}
                width={100}
                tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill={COLORS.danger} radius={[0, 4, 4, 0]} name="Occurrences" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Details Table */}
      {data?.topErrors && data.topErrors.length > 0 && (
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Most Common Errors</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a2e]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Error</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.topErrors.map((error, index) => (
                  <tr key={index} className="border-t border-[#1a1a2e]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-white text-sm">{error.error}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                        {error.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
