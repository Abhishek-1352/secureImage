import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Lock, Unlock, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check, ArrowDown } from 'lucide-react';
import api from '../services/api';

export const History = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/images/history');
      setOperations(res.data);
    } catch (err) {
      setError('Failed to load operation history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const copyHash = (hash, id) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen cyber-grid pb-20 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Cryptographic Audit History
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Immutable personal operation log & fingerprint verification trail
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl text-sm font-medium text-slate-300 glass-card hover:text-white hover:border-slate-500 flex items-center space-x-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="glass-panel rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-navy-900/90 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4">Timestamp (UTC)</th>
                <th className="px-6 py-4">Operation</th>
                <th className="px-6 py-4">Target File</th>
                <th className="px-6 py-4">Cryptographic Suite</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">SHA-256 Fingerprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                      <span className="font-mono text-xs">Querying SQLite audit database...</span>
                    </div>
                  </td>
                </tr>
              ) : operations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <HistoryIcon className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="font-medium text-slate-300">No cryptographic operations recorded yet.</p>
                      <p className="text-xs text-slate-500">
                        Encrypt or decrypt an image from the dashboard to populate your audit trail.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                operations.map((op) => (
                  <tr key={op.id} className="hover:bg-navy-900/40 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {new Date(op.created_at).toLocaleString('en-US', {
                        year: 'numeric', month: 'short', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                      })}
                    </td>

                    {/* Operation Badge */}
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

                    {/* Filename & Size */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-white max-w-[220px] truncate" title={op.original_filename}>
                        {op.original_filename}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {(op.file_size / 1024).toFixed(1)} KB
                      </span>
                    </td>

                    {/* Algorithm */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {op.algorithm}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {op.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-950 text-rose-400 border border-rose-500/40">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>FAILED</span>
                          </span>
                          {op.error_message && (
                            <p className="text-[10px] text-rose-400/90 max-w-[180px] truncate" title={op.error_message}>
                              {op.error_message}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* SHA-256 Fingerprint */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-slate-400 bg-navy-950 px-2 py-1 rounded border border-slate-800 truncate max-w-[150px]">
                          {op.sha256}
                        </span>
                        {op.sha256 !== 'UNKNOWN' && (
                          <button
                            onClick={() => copyHash(op.sha256, op.id)}
                            className="p-1 rounded hover:bg-navy-800 text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Copy full SHA-256"
                          >
                            {copiedId === op.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
