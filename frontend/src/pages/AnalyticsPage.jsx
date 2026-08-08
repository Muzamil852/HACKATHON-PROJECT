import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Clock, Target, AlertTriangle, CheckCircle2, BarChart3, TrendingDown } from 'lucide-react';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import KpiCard from '../components/ui/KpiCard';
import { toast } from 'react-hot-toast';

const API_BASE = 'http://localhost:8000';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#0284c7', '#7c3aed', '#dc2626', '#db2777', '#9333ea'];
const PRIORITY_COLORS = { 'CRITICAL': '#dc2626', 'HIGH': '#d97706', 'MEDIUM': '#2563eb', 'LOW': '#16a34a' };

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`${API_BASE}/analytics/`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const formatData = (obj) => {
    if (!obj) return [];
    return Object.entries(obj)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const formatTrendData = (obj) => {
    if (!obj) return [];
    return Object.entries(obj)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1">
          <p className="text-slate-900 font-bold">{label || payload[0].name}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.fill || '#2563eb' }} className="font-semibold">
              {entry.name === 'value' || entry.name === 'count' ? 'Count' : entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">Analytics Center</h1>
          <p className="text-slate-500 text-xs">City-wide infrastructure insights and performance metrics.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} variant="kpi" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const categoryData = formatData(data.category_distribution);
  const priorityData = formatData(data.priority_distribution);
  const deptData = formatData(data.department_workload);
  const trendData = formatTrendData(data.daily_trends);

  const totalComplaints = Object.values(data.status_distribution || {}).reduce((a, b) => a + b, 0);
  const activeIssues = (data.status_distribution?.['OPEN'] || 0) + (data.status_distribution?.['IN_PROGRESS'] || 0) + (data.status_distribution?.['ASSIGNED'] || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-blue-600" />
          Analytics Center
        </h1>
        <p className="text-xs text-slate-500 mt-1">City-wide infrastructure insights and performance metrics.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          label="Mean Resolution" 
          value={data.resolution_stats?.mean_hours ? `${data.resolution_stats.mean_hours.toFixed(1)}h` : 'N/A'} 
          icon={Clock} 
          color="#0284c7"
          trend="down"
          trendLabel="5%"
        />
        <KpiCard 
          label="Median Resolution" 
          value={data.resolution_stats?.median_hours ? `${data.resolution_stats.median_hours.toFixed(1)}h` : 'N/A'} 
          icon={Clock} 
          color="#2563eb" 
        />
        <KpiCard 
          label="Total Reports" 
          value={totalComplaints} 
          icon={Target} 
          color="#16a34a" 
        />
        <KpiCard 
          label="Active Issues" 
          value={activeIssues} 
          icon={AlertTriangle} 
          color="#d97706"
          trend="up"
          trendLabel="2%"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Trends */}
        <Card className="flex flex-col h-[380px] bg-white border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Daily Reporting Trends</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 25, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickMargin={10} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={3} dot={{ fill: '#16a34a', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category Distribution */}
        <Card className="flex flex-col h-[380px] bg-white border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Complaints by Category</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" width={90} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Priority Distribution */}
        <Card className="flex flex-col h-[380px] bg-white border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">Issue Priority Distribution</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="45%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Department Workload */}
        <Card className="flex flex-col h-[380px] bg-white border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Department Workload</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 20, bottom: 45, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} angle={-30} textAnchor="end" height={45} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* AI Statistical Insights */}
      {data.resolution_stats && data.resolution_stats.explanation && (
        <Card className="p-6 bg-white border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            AI Statistical Insights & Explanations
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{data.resolution_stats.explanation}</p>
        </Card>
      )}
    </div>
  );
}
