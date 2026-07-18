import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useGetIntersectionByIdQuery, 
  useGetTrafficHistoryQuery,
  usePredictOptimalPhaseMutation,
  useOverrideSignalMutation 
} from '../store/api/apiSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ArrowLeft, Activity, AlertTriangle, Zap, CheckCircle } from 'lucide-react';
import { useTrafficSocket } from '../hooks/useTrafficSocket';
import AsyncBoundary from '../components/common/AsyncBoundary';

const IntersectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const socket = useTrafficSocket();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  const { data: intersectionRes, isLoading: isLoadingInt, isError: isIntError, error: intError, refetch: refetchInt } = useGetIntersectionByIdQuery(id as string);
  const { data: historyRes, isLoading: isLoadingHist, isError: isHistError, error: histError, refetch: refetchHist } = useGetTrafficHistoryQuery(id as string);
  
  const [predictOptimalPhase, { isLoading: isPredicting }] = usePredictOptimalPhaseMutation();
  const [overrideSignal, { isLoading: isOverriding }] = useOverrideSignalMutation();

  const [liveData, setLiveData] = useState<any>(null);
  const [predictedPhase, setPredictedPhase] = useState<any>(null);
  const [fallbackWarning, setFallbackWarning] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ phase: 0, duration: 30 });
  const [overrideSuccess, setOverrideSuccess] = useState('');

  const intersection = intersectionRes?.data;
  const history = historyRes?.data?.data || []; // Note: paginated response is { data: { data: [...] } }

  useEffect(() => {
    if (!socket) return;

    const handleTrafficUpdate = (data: any) => {
      if (data.intersectionId === id) {
        setLiveData(data);
      }
    };

    const handleSignalChange = (data: any) => {
      if (data.intersectionId === id) {
        setPredictedPhase({ phase: data.currentPhase, duration: data.greenDuration });
        setFallbackWarning(false);
      }
    };

    socket.on('traffic:update', handleTrafficUpdate);
    socket.on('signal:change', handleSignalChange);

    return () => {
      socket.off('traffic:update', handleTrafficUpdate);
      socket.off('signal:change', handleSignalChange);
    };
  }, [id, socket]);

  // Remove old generic loading blocks, handle in render


  const handlePredict = async () => {
    try {
      const res = await predictOptimalPhase(id as string).unwrap();
      // res is { success, message, data: { recommended_phase, green_duration, fallback, ... } }
      setPredictedPhase({
        phase: res.data.recommended_phase,
        duration: res.data.green_duration
      });
      setFallbackWarning(res.data.fallback);
      setOverrideSuccess(''); // clear any old success message
    } catch (err: any) {
      console.error('Prediction failed:', err);
      // Could show a toast here in a real app
    }
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await overrideSignal({ id: id as string, phase: overrideForm.phase, duration: overrideForm.duration }).unwrap();
      setOverrideSuccess('Signal override applied successfully!');
      setTimeout(() => setOverrideSuccess(''), 3000);
      setPredictedPhase({ phase: overrideForm.phase, duration: overrideForm.duration });
      setFallbackWarning(false);
    } catch (err) {
      console.error('Override failed:', err);
    }
  };

  // Format chart data
  const chartData = [...history].reverse().map((r: any) => ({
    time: format(new Date(r.timestamp), 'HH:mm'),
    vehicles: r.vehicleCounts?.total || 0,
    congestion: r.congestionLevel * 10,
  }));

  // Determine congestion text
  const congestionLevel = liveData ? liveData.congestionLevel : 0;
  let statusBadge = { text: 'Flowing', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  if (congestionLevel > 7) statusBadge = { text: 'Congested', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  else if (congestionLevel > 4) statusBadge = { text: 'Moderate', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };

  // Current display phase
  const activePhase = predictedPhase?.phase ?? liveData?.currentPhase ?? 0;
  const greenDuration = predictedPhase?.duration ?? liveData?.greenDuration ?? '-';

  return (
    <AsyncBoundary 
      isLoading={isLoadingInt} 
      isError={isIntError || (!isLoadingInt && !intersection)} 
      error={intError || { message: "Intersection not found" }} 
      onRetry={refetchInt} 
      loadingMessage="Loading intersection details..."
    >
      {intersection && (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/map')} className="p-2 bg-white dark:bg-dark-panel rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                {intersection.name} 
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge.color}`}>
                  {statusBadge.text}
                </span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-mono text-sm">{intersection.intersectionId} | {intersection.highway}</p>
            </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Signal State Panel */}
        <div className="md:col-span-1 bg-white dark:bg-dark-panel p-6 rounded-xl shadow-sm border border-slate-100 dark:border-dark-border flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
          <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
            <Activity className="w-4 h-4" /> Signal State
          </div>
          
          <div className="mt-8 flex flex-col items-center">
            {/* Traffic Light Visual */}
            <div className="bg-slate-800 p-4 rounded-full flex flex-col gap-3 shadow-inner">
              <div className={`w-12 h-12 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] ${activePhase === 0 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-red-900/40'}`} />
              <div className={`w-12 h-12 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] ${activePhase === 1 ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-yellow-900/40'}`} />
              <div className={`w-12 h-12 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] ${activePhase === 2 ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-green-900/40'}`} />
              <div className={`w-12 h-12 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] ${activePhase === 3 ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-blue-900/40'}`} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">Phase {activePhase}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Green: {greenDuration}s</p>
            </div>
          </div>
          
          {fallbackWarning && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-1.5 rounded-full mt-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Using fallback  ML service unavailable
            </div>
          )}

          <button 
            onClick={handlePredict}
            disabled={isPredicting}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isPredicting ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Predicting...</span>
            ) : (
              <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Predict Optimal Phase</span>
            )}
          </button>
        </div>

        {/* Traffic History Chart */}
        <div className="md:col-span-2 bg-white dark:bg-dark-panel p-6 rounded-xl shadow-sm border border-slate-100 dark:border-dark-border flex flex-col">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Traffic History</h3>
          <div className="flex-1 min-h-[300px]">
            <AsyncBoundary isLoading={isLoadingHist} isError={isHistError} error={histError} onRetry={refetchHist} loadingMessage="Loading history...">
              {chartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400">No historical data available</div>
              ) : (
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
                    <Line yAxisId="left" type="monotone" dataKey="vehicles" name="Vehicles" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="congestion" name="Congestion (x10)" stroke="#f43f5e" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </AsyncBoundary>
          </div>
        </div>
      </div>

      {/* Admin Override Panel */}
      {isAdmin && (
        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone: Manual Override
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-6 max-w-2xl">
            As an administrator, you can force the intersection into a specific phase. This bypasses the ML agent and standard timings. Use only in emergencies.
          </p>
          
          <form onSubmit={handleOverride} className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-red-800 dark:text-red-300 mb-1">Target Phase (0-3)</label>
              <input 
                type="number" 
                min="0" max="3" 
                value={overrideForm.phase}
                onChange={e => setOverrideForm({...overrideForm, phase: parseInt(e.target.value)})}
                className="w-32 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-800 dark:text-red-300 mb-1">Duration (seconds)</label>
              <input 
                type="number" 
                min="10" max="120"
                value={overrideForm.duration}
                onChange={e => setOverrideForm({...overrideForm, duration: parseInt(e.target.value)})}
                className="w-32 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <button 
              type="submit"
              disabled={isOverriding}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium px-6 py-2 rounded-lg transition-colors shadow-sm"
            >
              {isOverriding ? 'Applying...' : 'Force Override'}
            </button>
            
            {overrideSuccess && (
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" /> {overrideSuccess}
              </div>
            )}
          </form>
        </div>
      )}
        </div>
      )}
    </AsyncBoundary>
  );
};

export default IntersectionDetail;
