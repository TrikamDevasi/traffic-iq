import React, { useState, useEffect } from 'react';
import { 
  useRunSimulationMutation, 
  useGetSimulationByIdQuery,
  useGetSimulationHistoryQuery
} from '../store/api/apiSlice';
import { PlayCircle, Clock, CheckCircle, XCircle, BarChart3, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import AsyncBoundary from '../components/common/AsyncBoundary';

const Simulation = () => {
  const [form, setForm] = useState({
    scenario: 'Ahmedabad-GN Highway',
    duration: 300,
    controllerType: 'MARL',
    comparedTo: 'fixed-time'
  });

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number>(3000);
  const [elapsed, setElapsed] = useState(0);

  const [runSimulation, { isLoading: isStarting }] = useRunSimulationMutation();
  const { data: runRes, error: _runError, isFetching: _isPolling } = useGetSimulationByIdQuery(activeRunId as string, {
    skip: !activeRunId,
    pollingInterval: activeRunId ? pollingInterval : 0
  });

  const { data: historyRes, isLoading: isLoadingHistory, isError: isHistoryError, error: historyError, refetch: refetchHistory } = useGetSimulationHistoryQuery({ limit: 10 });
  const [selectedRun, setSelectedRun] = useState<any>(null);

  // Manage polling logic for async runs
  useEffect(() => {
    let timer: any;
    if (activeRunId) {
      timer = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          // After 30s, switch to 10s polling
          if (next >= 30 && pollingInterval === 3000) {
            setPollingInterval(10000);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeRunId, pollingInterval]);

  // Stop polling when completed or failed
  useEffect(() => {
    if (runRes?.data) {
      const { status } = runRes.data;
      if (status === 'completed' || status === 'failed') {
        setActiveRunId(null); // stop polling
        setSelectedRun(runRes.data);
        refetchHistory();
      }
    }
  }, [runRes, refetchHistory]);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await runSimulation(form).unwrap();
      // res could be 201 (sync) or 202 (async)
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        // Sync return
        setSelectedRun(res.data);
        refetchHistory();
      } else {
        // Async return (status: 'running')
        setActiveRunId(res.data.runId);
        setElapsed(0);
        setPollingInterval(3000);
        setSelectedRun(null);
      }
    } catch (err) {
      console.error('Simulation failed to start', err);
    }
  };

  const currentView = selectedRun || (activeRunId && runRes?.data) || null;
  const isRunning = activeRunId !== null;

  // Chart data formatting
  let chartData: any[] = [];
  if (currentView?.status === 'completed') {
    chartData = [
      {
        name: 'Wait Time (s)',
        [currentView.comparedTo]: currentView.avgWaitTimeReduction > 0 ? (100) : 0, // Mocked baseline vs reduction
        'MARL Agent': currentView.avgWaitTimeReduction > 0 ? (100 - currentView.avgWaitTimeReduction) : 0,
      },
      {
        name: 'Travel Time (s)',
        [currentView.comparedTo]: currentView.avgTravelTimeReduction > 0 ? (200) : 0,
        'MARL Agent': currentView.avgTravelTimeReduction > 0 ? (200 - currentView.avgTravelTimeReduction) : 0,
      },
      {
        name: 'Bus Speed (%)',
        [currentView.comparedTo]: 100,
        'MARL Agent': 100 + currentView.busSpeedImprovement,
      }
    ];
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Traffic Simulation</h1>
        <p className="text-slate-500 dark:text-slate-400">Run multi-agent reinforcement learning simulations against baseline models.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-dark-panel p-6 rounded-xl border border-slate-200 dark:border-dark-border shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-500" /> New Simulation
            </h2>
            
            <form onSubmit={handleRun} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Scenario</label>
                <input 
                  type="text" 
                  value={form.scenario}
                  onChange={e => setForm({...form, scenario: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (seconds)</label>
                <input 
                  type="number" 
                  min="60" max="3600"
                  value={form.duration}
                  onChange={e => setForm({...form, duration: parseInt(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Runs &gt; 300s execute asynchronously.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Compared To (Baseline)</label>
                <select 
                  value={form.comparedTo}
                  onChange={e => setForm({...form, comparedTo: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed-time">Fixed-Time</option>
                  <option value="DQN">DQN (Deep Q-Network)</option>
                  <option value="actuated">Actuated (Sensor-based)</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={isRunning || isStarting}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isRunning || isStarting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running...</>
                ) : (
                  <><PlayCircle className="w-4 h-4" /> Run Simulation</>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-dark-panel p-6 rounded-xl border border-slate-200 dark:border-dark-border shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" /> History
            </h2>
            <AsyncBoundary isLoading={isLoadingHistory} isError={isHistoryError} error={historyError} onRetry={refetchHistory} loadingMessage="Loading history...">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {historyRes?.data?.runs?.map((run: any) => (
                  <div 
                    key={run.runId} 
                    onClick={() => setSelectedRun(run)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedRun?.runId === run.runId ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">{run.runId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${run.status === 'completed' ? 'bg-green-100 text-green-700' : run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{run.scenario}</div>
                    <div className="text-xs text-slate-500 mt-1 flex justify-between">
                      <span>vs {run.comparedTo}</span>
                      <span>{format(new Date(run.startedAt), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AsyncBoundary>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-panel p-6 rounded-xl border border-slate-200 dark:border-dark-border shadow-sm h-full flex flex-col min-h-[500px]">
            {isRunning ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Simulation in Progress</h3>
                <p className="text-slate-500">Run ID: <span className="font-mono">{activeRunId}</span></p>
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full">
                  <Activity className="w-4 h-4 animate-pulse" /> Elapsed: {elapsed}s
                </div>
              </div>
            ) : !currentView ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                <p>Run a simulation or select one from history to view results.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col animate-in fade-in">
                <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Results: {currentView.scenario}
                      {currentView.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Run ID: <span className="font-mono">{currentView.runId}</span> | Duration: {currentView.duration}s</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Baseline</div>
                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold">{currentView.comparedTo}</div>
                  </div>
                </div>

                {currentView.status === 'failed' ? (
                  <div className="flex-1 flex items-center justify-center text-red-500">
                    Simulation failed to complete. Check backend logs for details.
                  </div>
                ) : (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="text-sm text-slate-500 mb-1">Avg Wait Time</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">-{currentView.avgWaitTimeReduction}%</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="text-sm text-slate-500 mb-1">Travel Time</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">-{currentView.avgTravelTimeReduction}%</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="text-sm text-slate-500 mb-1">Bus Speed</div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">+{currentView.busSpeedImprovement}%</div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#334155', opacity: 0.1 }}
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar dataKey={currentView.comparedTo} fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={60} />
                          <Bar dataKey="MARL Agent" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
