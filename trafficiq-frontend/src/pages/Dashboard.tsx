import { useGetKpisQuery, useGetTrendsQuery } from '../store/api/apiSlice';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, MapPin, Activity } from 'lucide-react';
import { format } from 'date-fns';
import AsyncBoundary from '../components/common/AsyncBoundary';

const Dashboard = () => {
  const { data: kpisRes, isLoading: isLoadingKpis, isError: isKpisError, error: kpisError, refetch: refetchKpis } = useGetKpisQuery({});
  const { data: trendsRes, isLoading: isLoadingTrends, isError: isTrendsError, error: trendsError, refetch: refetchTrends } = useGetTrendsQuery('24h');

  const kpis = kpisRes?.data || [];
  const trends = trendsRes?.data || [];

  const avgCongestion = kpis.length > 0 
    ? (kpis.reduce((acc: number, k: any) => acc + k.maxCongestion, 0) / kpis.length).toFixed(1)
    : 0;

  const totalIntersections = kpis.length;

  const formatTrendData = () => {
    return trends.map((t: any) => ({
      time: format(new Date(t._id.year, t._id.month - 1, t._id.day, t._id.hour), 'HH:mm'),
      throughput: t.totalThroughput,
      congestion: t.avgCongestion * 10, // scale for visibility
    }));
  };

  const chartData = formatTrendData();

  return (
    <AsyncBoundary
      isLoading={isLoadingKpis || isLoadingTrends}
      isError={isKpisError || isTrendsError}
      error={kpisError || trendsError}
      onRetry={() => { refetchKpis(); refetchTrends(); }}
      loadingMessage="Loading dashboard data..."
    >
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Command Center</h1>
        <p className="text-slate-500 dark:text-slate-400">Overview of current traffic conditions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-panel p-6 rounded-xl shadow-sm border border-slate-100 dark:border-dark-border flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Alerts</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">0</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-panel p-6 rounded-xl shadow-sm border border-slate-100 dark:border-dark-border flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Intersections</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalIntersections}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-panel p-6 rounded-xl shadow-sm border border-slate-100 dark:border-dark-border flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg Congestion Level</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {avgCongestion} / 10
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-panel p-6 rounded-xl shadow-sm border border-slate-100 dark:border-dark-border">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Traffic Trends (24h)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="throughput" name="Vehicles/hr" stroke="#0ea5e9" strokeWidth={3} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="congestion" name="Congestion (x10)" stroke="#f43f5e" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AsyncBoundary>
  );
};

export default Dashboard;
