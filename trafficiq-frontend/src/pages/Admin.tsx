import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import { 
  useGetUsersQuery, 
  useUpdateUserRoleMutation, 
  useDeactivateUserMutation,
  useGetSystemHealthQuery,
  useGetAuditLogsQuery
} from '../store/api/apiSlice';
import { 
  ShieldAlert, 
  Activity, 
  Database, 
  Server, 
  Cpu, 
  Users, 
  Clock, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import AsyncBoundary from '../components/common/AsyncBoundary';

const Admin = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'health'>('users');

  // Fetch Data
  const { data: usersData, isLoading: isLoadingUsers, isError: isUsersError, error: usersError, refetch: refetchUsers } = useGetUsersQuery({ page: 1, limit: 100 });
  const { data: auditData, isLoading: isLoadingAudit, isError: isAuditError, error: auditError, refetch: refetchAudit } = useGetAuditLogsQuery({ page: 1, limit: 50 });
  const { data: healthData, isLoading: isLoadingHealth, isError: isHealthError, error: healthError, refetch: refetchHealth } = useGetSystemHealthQuery(undefined, { pollingInterval: 30000 });

  // Mutations
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [deactivateUser] = useDeactivateUserMutation();

  // Role Guard
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 p-6">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
          You do not have the required administrator privileges to view this page.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-md transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole({ id: userId, role: newRole }).unwrap();
    } catch (err) {
      console.error('Failed to update role', err);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (window.confirm('Are you sure you want to deactivate this user? They will not be able to log in.')) {
      try {
        await deactivateUser(userId).unwrap();
      } catch (err) {
        console.error('Failed to deactivate user', err);
      }
    }
  };

  const users = usersData?.data || [];
  const auditLogs = auditData?.data || [];
  const health = healthData?.data || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">
            Admin Control Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage users, view audit logs, and monitor system health.</p>
        </div>
        <div className="bg-white dark:bg-dark-panel border border-slate-200 dark:border-dark-border rounded-xl p-1 shadow-sm flex space-x-1">
          {['users', 'audit', 'health'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={clsx(
                "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === tab 
                  ? "bg-slate-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-dark-panel border border-slate-200 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-500" />
              User Management
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
                <AsyncBoundary 
                  isLoading={isLoadingUsers} 
                  isError={isUsersError} 
                  error={usersError} 
                  onRetry={refetchUsers}
                  loadingMessage="Loading users..."
                >
                  {users.map((u: any) => (
                    <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white whitespace-nowrap">{u.name}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 whitespace-nowrap">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          disabled={u._id === user.id}
                          className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500 disabled:opacity-50"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="operator">Operator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          u.isActive 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                        )}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeactivate(u._id)}
                          disabled={u._id === user.id || !u.isActive}
                          className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 disabled:opacity-30 disabled:hover:text-rose-600 font-medium text-sm transition-colors"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </AsyncBoundary>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-dark-panel border border-slate-200 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-500" />
              Security Audit Log
            </h2>
          </div>
          <div className="p-6">
            <AsyncBoundary
              isLoading={isLoadingAudit}
              isError={isAuditError}
              error={auditError}
              onRetry={refetchAudit}
              loadingMessage="Loading audit logs..."
            >
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                {auditLogs.map((log: any, idx: number) => (
                  <div key={log._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-dark-panel bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-panel shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900 dark:text-white capitalize truncate">{log.action.replace(/_/g, ' ')}</div>
                        <time className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                        </time>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 mt-2 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium text-xs uppercase tracking-wider min-w-[50px]">Actor</span>
                          <span className="truncate">{log.userId?.name || 'System'} <span className="text-slate-400 text-xs hidden sm:inline">({log.userId?.email || 'N/A'})</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium text-xs uppercase tracking-wider min-w-[50px]">Target</span>
                          <span className="truncate">{log.resource} / {log.resourceId}</span>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded text-xs overflow-x-auto">
                            <pre className="text-slate-500 dark:text-slate-400 m-0">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AsyncBoundary>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <AsyncBoundary
          isLoading={isLoadingHealth}
          isError={isHealthError}
          error={healthError}
          onRetry={refetchHealth}
          loadingMessage="Loading system health..."
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <HealthCard 
                title="API Gateway" 
                status={health.api?.status} 
                icon={<Server className="h-6 w-6" />} 
                uptime={health.uptime}
              />
              <HealthCard 
                title="MongoDB" 
                status={health.mongodb?.status} 
                icon={<Database className="h-6 w-6" />} 
              />
              <HealthCard 
                title="Redis Cache" 
                status={health.redis?.status} 
                icon={<Database className="h-6 w-6" />} 
              />
              <HealthCard 
                title="ML Service (MARL/YOLO)" 
                status={health.mlService?.status} 
                icon={<Cpu className="h-6 w-6" />} 
                extra={health.mlService?.url}
              />
              <HealthCard 
                title="MQTT Broker" 
                status={health.mqtt?.status} 
                icon={<Activity className="h-6 w-6" />} 
              />
              
              <div className="bg-white dark:bg-dark-panel p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full mb-3">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {health.socketClients ?? '-'}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active WebSocket Clients</p>
              </div>
              
            </div>
          </div>
        </AsyncBoundary>
      )}
    </div>
  );
};

const HealthCard = ({ title, status, icon, uptime, extra }: any) => {
  const isUp = status === 'connected' || status === 'up';
  
  return (
    <div className="bg-white dark:bg-dark-panel p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm relative overflow-hidden group">
      <div className={clsx(
        "absolute top-0 left-0 w-full h-1",
        isUp ? "bg-emerald-500" : "bg-rose-500"
      )} />
      <div className="flex justify-between items-start mb-4">
        <div className={clsx(
          "p-2 rounded-lg",
          isUp ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" 
               : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        )}>
          {icon}
        </div>
        {isUp ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Operational
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-full">
            <XCircle className="h-3 w-3" /> Disconnected
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
        {extra ? extra : (isUp ? 'Systems running normally' : 'Service unreachable')}
      </p>
      {uptime && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Uptime: {Math.floor(uptime / 3600)}h {Math.floor((uptime % 3600) / 60)}m
          </p>
        </div>
      )}
    </div>
  );
};

export default Admin;
