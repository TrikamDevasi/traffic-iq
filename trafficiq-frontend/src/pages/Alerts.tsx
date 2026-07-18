import React, { useEffect, useState } from 'react';
import { 
  useGetAlertsQuery, 
  useGetAlertStatsQuery, 
  useResolveAlertMutation 
} from '../store/api/apiSlice';
import { useTrafficSocket } from '../hooks/useTrafficSocket';
import { AlertTriangle, CheckCircle, Clock, Info, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import AsyncBoundary from '../components/common/AsyncBoundary';

const Alerts = () => {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [realtimeAlerts, setRealtimeAlerts] = useState<any[]>([]);
  const user = useSelector((state: RootState) => state.auth.user);
  const canResolve = user?.role === 'operator' || user?.role === 'admin';

  const queryParams = filter === 'all' ? undefined : { isResolved: filter === 'resolved' };
  const { data: alertsRes, isLoading, isError, error, refetch } = useGetAlertsQuery(queryParams);
  const { data: statsRes } = useGetAlertStatsQuery(undefined, { pollingInterval: 60000 });
  const [resolveAlert] = useResolveAlertMutation();
  
  const socket = useTrafficSocket();

  useEffect(() => {
    if (!socket) return;
    const handleNewAlert = (alert: any) => {
      // If we are filtering by resolved, don't show new active alerts
      if (filter === 'resolved') return;
      setRealtimeAlerts(prev => [alert, ...prev]);
    };
    socket.on('alert:new', handleNewAlert);
    return () => {
      socket.off('alert:new', handleNewAlert);
    };
  }, [socket, filter]);

  // Reset realtime alerts when filter changes to prevent stale data
  useEffect(() => {
    setRealtimeAlerts([]);
  }, [filter]);

  const queryAlerts = alertsRes?.data || [];
  // Merge and deduplicate just in case
  const allAlerts = [...realtimeAlerts, ...queryAlerts].filter((v, i, a) => a.findIndex(t => (t._id || t.id) === (v._id || v.id)) === i);

  const handleResolve = async (id: string) => {
    try {
      // Optimistic update happens in apiSlice, but we also update local realtime array
      setRealtimeAlerts(prev => prev.map(a => (a._id || a.id) === id ? { ...a, isResolved: true } : a));
      await resolveAlert(id).unwrap();
    } catch (err) {
      console.error('Failed to resolve alert', err);
      // rollback handled by apiSlice automatically for query data
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400';
      case 'high':
        return 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'medium':
        return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'medium': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Alerts</h1>
          <p className="text-slate-500 dark:text-slate-400">Monitor and resolve traffic incidents and system issues.</p>
        </div>
        
        {statsRes?.data && (
          <div className="flex gap-4 text-sm bg-white dark:bg-dark-panel px-4 py-2 rounded-lg border border-slate-200 dark:border-dark-border shadow-sm">
            <div className="flex items-center gap-1.5"><span className="font-semibold text-slate-900 dark:text-white">{statsRes.data.active}</span> Active</div>
            <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-1.5"><span className="font-semibold text-red-600 dark:text-red-400">{statsRes.data.critical}</span> Critical</div>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-dark-border pb-px">
        {['all', 'active', 'resolved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        loadingMessage="Loading alerts..."
      >
        {allAlerts.length === 0 ? (
          <div className="bg-white dark:bg-dark-panel border border-slate-200 dark:border-dark-border rounded-xl p-12 text-center shadow-sm">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Alerts Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">There are no {filter !== 'all' ? filter : ''} alerts at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allAlerts.map((alert: any) => {
              const id = alert._id || alert.id;
              const isResolved = alert.isResolved;
              const style = getSeverityStyle(alert.severity);

              // Hide locally if it doesn't match filter (e.g. if resolved optimistically while in "active" tab)
              if (filter === 'active' && isResolved) return null;
              if (filter === 'resolved' && !isResolved) return null;

              return (
                <div 
                  key={id} 
                  className={`p-4 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${isResolved ? 'bg-white dark:bg-dark-panel border-slate-200 dark:border-slate-800 opacity-60' : style}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 shrink-0">
                      {isResolved ? <CheckCircle className="w-5 h-5 text-slate-400" /> : getSeverityIcon(alert.severity)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${isResolved ? 'text-slate-700 dark:text-slate-300' : ''}`}>{alert.message}</h3>
                        {isResolved && <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">Resolved</span>}
                      </div>
                      <div className="text-sm flex flex-wrap items-center gap-x-4 gap-y-1 opacity-80">
                        <span><strong>Type:</strong> {alert.type}</span>
                        <span><strong>Intersection:</strong> {alert.intersectionId}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(alert.createdAt), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  </div>

                  {!isResolved && canResolve && (
                    <button 
                      onClick={() => handleResolve(id)}
                      className="shrink-0 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
};

export default Alerts;
