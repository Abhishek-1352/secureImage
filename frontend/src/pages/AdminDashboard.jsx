import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, Lock, Unlock, AlertTriangle, ShieldCheck, 
  UserCheck, UserX, RefreshCw, Filter, Clock, Eye, AlertCircle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminDashboard = () => {
  const { user: currentAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'logs'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load admin stats", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = {};
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/admin/logs', { params });
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, statusFilter]);

  const handleToggleUserStatus = async (userId, currentStatus, userEmail) => {
    if (userId === currentAdmin?.id && currentStatus) {
      setActionMessage({ type: 'error', text: 'You cannot deactivate your own administrative account.' });
      setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
      return;
    }

    try {
      await api.patch(`/admin/users/${userId}/status`, { is_active: !currentStatus });
      setActionMessage({
        type: 'success',
        text: `Account for ${userEmail} successfully ${!currentStatus ? 'activated' : 'deactivated'}.`
      });
      setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
      // Refresh user list and stats
      fetchUsers();
      fetchStats();
      fetchLogs();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update user status.';
      setActionMessage({ type: 'error', text: msg });
      setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
    }
  };

  // Pie chart colors
  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444'];
  const pieData = stats ? [
    { name: 'Encryptions', value: stats.operations_ratio.encryptions },
    { name: 'Decryptions', value: stats.operations_ratio.decryptions },
    { name: 'Failed Operations', value: stats.operations_ratio.failed },
  ] : [];

  return (
    <div className="min-h-screen cyber-grid pb-20 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Security Administration Center
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Centralized telemetry, RBAC governance, and forensic audit analysis
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadAll}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl text-sm font-medium text-slate-300 glass-card hover:text-white hover:border-slate-500 flex items-center space-x-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {actionMessage.text && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center space-x-3 text-sm ${
          actionMessage.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {actionMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* ================= TOP STATISTICS CARDS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        
        {/* Total Users */}
        <div className="glass-card p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Total Users</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats ? stats.total_users : '--'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Registered accounts</span>
        </div>

        {/* Active Users */}
        <div className="glass-card p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Active Users</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {stats ? stats.active_users : '--'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {stats ? `${stats.inactive_users} deactivated` : '--'}
          </span>
        </div>

        {/* Total Encryptions */}
        <div className="glass-card p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Encryptions</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">
            {stats ? stats.total_encryptions : '--'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">AES-256-GCM packages</span>
        </div>

        {/* Total Decryptions */}
        <div className="glass-card p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Decryptions</span>
            <Unlock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400 font-mono">
            {stats ? stats.total_decryptions : '--'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Verified plaintext recoveries</span>
        </div>

        {/* Failed Operations */}
        <div className="glass-card p-5 rounded-2xl border border-slate-700/60 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Failed Ops</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            {stats ? stats.failed_operations : '--'}
          </div>
          <span className="text-[11px] text-rose-400/80 mt-1 block">Tamper / auth anomalies</span>
        </div>

      </div>

      {/* ================= TELEMETRY CHARTS ================= */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Daily Operations Bar Chart */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-700/80 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                7-Day Cryptographic Operations Volume
              </h3>
              <span className="text-xs text-slate-400 font-mono">Real-time DB query</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.daily_chart}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="encryptions" fill="#06b6d4" name="Encryptions" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="decryptions" fill="#8b5cf6" name="Decryptions" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill="#f43f5e" name="Failures" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ratio Pie Chart */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Operations Breakdown
              </h3>
            </div>
            <div className="h-56 w-full flex items-center justify-center">
              {stats.operations_ratio.encryptions + stats.operations_ratio.decryptions + stats.operations_ratio.failed > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-500 font-mono">No operations recorded yet</p>
              )}
            </div>
            <div className="text-[11px] text-center text-slate-400 font-mono pt-2 border-t border-slate-800">
              Total Recorded Events: {stats.total_encryptions + stats.total_decryptions + stats.failed_operations}
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB NAVIGATION ================= */}
      <div className="flex border-b border-slate-700/80 mb-6 space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Recent Operations
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'users'
              ? 'border-purple-400 text-purple-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          User Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'logs'
              ? 'border-emerald-400 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit Logs ({logs.length})
        </button>
      </div>

      {/* ================= TAB 1: RECENT OPERATIONS ================= */}
      {activeTab === 'overview' && (
        <div className="glass-panel rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
          <div className="p-4 bg-navy-900/60 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300">
              Latest System-Wide Operations (Past 10)
            </h4>
            <span className="text-[11px] font-mono text-slate-500">Zero raw keys stored</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900/90 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Time (UTC)</th>
                  <th className="px-6 py-4">Operation</th>
                  <th className="px-6 py-4">Target File</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">SHA-256 Digest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {!stats?.recent_operations || stats.recent_operations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500 font-mono text-xs">
                      No operations recorded in database yet.
                    </td>
                  </tr>
                ) : (
                  stats.recent_operations.map((op) => (
                    <tr key={op.id} className="hover:bg-navy-900/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(op.created_at).toLocaleString('en-US', {
                          month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {op.operation_type === 'ENCRYPT' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-900/40 text-cyan-300 border border-cyan-500/30">
                            <Lock className="w-3 h-3 text-cyan-400" />
                            <span>ENCRYPT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-900/40 text-purple-300 border border-purple-500/30">
                            <Unlock className="w-3 h-3 text-purple-400" />
                            <span>DECRYPT</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate" title={op.original_filename}>
                        {op.original_filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {op.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>SUCCESS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-950 text-rose-400 border border-rose-500/40">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>FAILED</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 truncate max-w-[150px]">
                        {op.sha256}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: USER MANAGEMENT ================= */}
      {activeTab === 'users' && (
        <div className="glass-panel rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900/90 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Operations Count</th>
                  <th className="px-6 py-4">Member Since</th>
                  <th className="px-6 py-4 text-right">Access Control Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => {
                  const isCurrentAdmin = u.id === currentAdmin?.id;
                  return (
                    <tr key={u.id} className="hover:bg-navy-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{u.full_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-900/50 text-purple-300 border border-purple-500/40'
                            : 'bg-blue-900/40 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.is_active ? (
                          <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 text-xs text-rose-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                            <span>DEACTIVATED</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {u.operations_count} ops
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: '2-digit', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isCurrentAdmin ? (
                          <span className="text-[11px] font-mono text-slate-500 px-3 py-1.5 rounded bg-navy-900/80 border border-slate-800">
                            Current Session
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.is_active, u.email)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                              u.is_active
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: AUDIT LOGS ================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="glass-card p-4 rounded-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span>Filter Events:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Action Filter */}
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-navy-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Actions</option>
                <option value="USER_LOGIN">USER_LOGIN</option>
                <option value="IMAGE_ENCRYPTION">IMAGE_ENCRYPTION</option>
                <option value="IMAGE_DECRYPTION">IMAGE_DECRYPTION</option>
                <option value="USER_REGISTER">USER_REGISTER</option>
                <option value="USER_ACTIVATED">USER_ACTIVATED</option>
                <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-navy-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">SUCCESS Only</option>
                <option value="FAILED">FAILED Only</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="glass-panel rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-navy-900/90 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Timestamp (UTC)</th>
                    <th className="px-6 py-4">Actor</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-mono text-xs">
                        No audit events matching criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-navy-900/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-US', {
                            month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                          })}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                          {log.user_email || `User #${log.user_id || 'System'}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-cyan-300 font-semibold bg-navy-900 px-2 py-0.5 rounded border border-slate-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.status === 'SUCCESS' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                              SUCCESS
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/40">
                              FAILED
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-300 max-w-[320px] break-words">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
