// src/components/AIGameEnginePanel.tsx
import { useState, useEffect } from 'react';
import { AGEA } from '@/engine/AIGameEngineArchitect';
import { motion } from 'framer-motion';
import { Terminal, Cpu, ShieldAlert, Zap, Layers, X } from 'lucide-react';

interface Props {
  onClose: () => void;
  activeGameId?: string | null;
}

export function AIGameEnginePanel({ onClose, activeGameId }: Props) {
  const [activeTab, setActiveTab] = useState<'status' | 'logs'>('status');
  const [selectedGameId, setSelectedGameId] = useState<string>(activeGameId || 'match3');
  const [, setTick] = useState(0);

  // Hook subscription to keep UI updated with the selected game's engine state
  const selectedInstance = AGEA.registry.get(selectedGameId);

  useEffect(() => {
    const unsubscribe = AGEA.subscribe(() => {
      setTick(t => t + 1);
    });
    return () => unsubscribe();
  }, []);

  const triggerSimulatedError = (message: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    const instance = AGEA.registry.get(selectedGameId);
    if (!instance) return;

    AGEA.logEvent('RUNTIME_EXCEPTION', `[${instance.meta.title}] Exception: ${message}`);
    instance.errorLog.unshift({
      timestamp: new Date().toLocaleTimeString(),
      message,
      severity,
      solved: false
    });

    // Auto-heal trigger
    setTimeout(() => {
      const err = instance.errorLog.find(e => e.message === message);
      if (err) {
        err.solved = true;
        AGEA.logEvent('SELF_HEALING', `[${instance.meta.title}] Patched: wrapped context in recovery boundary.`);
        setTick(t => t + 1);
      }
    }, 2000);

    setTick(t => t + 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-emerald-400';
      case 'upgrading': return 'text-amber-400';
      case 'requires_upgrade': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-[#090b11]/95 border-l border-cyan-500/20 backdrop-blur-xl z-[9999] flex flex-col shadow-2xl text-slate-100 font-sans"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Cpu className="text-cyan-400 animate-pulse" size={20} />
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase text-cyan-400">AI Engine Architect</h2>
            <p className="text-3xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Autonomous Loop Active
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200">
          <X size={18} />
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/20 text-xs">
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 py-3 text-center border-b-2 font-semibold flex items-center justify-center gap-1.5 ${
            activeTab === 'status' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Layers size={14} />
          Engine Status
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-3 text-center border-b-2 font-semibold flex items-center justify-center gap-1.5 ${
            activeTab === 'logs' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Terminal size={14} />
          System Logs
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'status' ? (
          <>
            {/* Game Selector */}
            <div className="space-y-1.5">
              <label className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">Inspect Game Engine</label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full bg-[#111422] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
              >
                {Array.from(AGEA.registry.values()).map(inst => (
                  <option key={inst.gameId} value={inst.gameId}>
                    {inst.meta.title} ({inst.id})
                  </option>
                ))}
              </select>
            </div>

            {selectedInstance ? (
              <div className="space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#121626] border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-3xs text-slate-400 uppercase">Frame Rate</span>
                    <span className="text-lg font-bold font-mono text-cyan-400">{selectedInstance.metrics.fps} <span className="text-3xs">FPS</span></span>
                  </div>
                  <div className="bg-[#121626] border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-3xs text-slate-400 uppercase">LOD Scale</span>
                    <span className="text-lg font-bold font-mono text-cyan-400">{Math.round(selectedInstance.lodScale * 100)}%</span>
                  </div>
                  <div className="bg-[#121626] border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-3xs text-slate-400 uppercase">Input Latency</span>
                    <span className="text-lg font-bold font-mono text-cyan-400">{selectedInstance.metrics.latencyMS} <span className="text-3xs">ms</span></span>
                  </div>
                  <div className="bg-[#121626] border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-3xs text-slate-400 uppercase">AI-Upscaling</span>
                    <span className={`text-lg font-bold font-mono ${selectedInstance.upscalingEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {selectedInstance.upscalingEnabled ? 'ACTIVE' : 'STANDBY'}
                    </span>
                  </div>
                </div>

                {/* Modules Upgrade Status */}
                <div className="bg-[#121626] border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-3xs font-semibold text-slate-400 uppercase">Engine Modules</span>
                    <span className="text-3xs text-cyan-400 font-mono">v1.x</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {Object.values(selectedInstance.modules).map(mod => (
                      <div key={mod.name} className="flex items-center justify-between text-2xs py-0.5">
                        <span className="text-slate-300 font-semibold">{mod.name}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-400">v{mod.version}</span>
                          <span className={`font-semibold capitalize ${getStatusColor(mod.status)}`}>
                            {mod.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features Deployment (Canaries) */}
                <div className="bg-[#121626] border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <span className="text-3xs font-semibold text-slate-400 uppercase block border-b border-slate-800 pb-2">
                    Dynamic Adaptors Rollout
                  </span>
                  <div className="space-y-3 pt-1 text-2xs">
                    {Object.entries(selectedInstance.featureAdapterConfig).map(([key, active]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="capitalize text-slate-300">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className={`font-mono font-bold ${active ? 'text-cyan-400' : 'text-slate-500'}`}>
                            {active ? `${Math.round(selectedInstance.rolloutProgress * 100)}% Rollout` : 'STANDBY'}
                          </span>
                        </div>
                        {active && (
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedInstance.rolloutProgress * 100}%` }}
                              className="h-full bg-cyan-400"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulator Controls */}
                <div className="bg-[#121626] border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                  <span className="text-3xs font-semibold text-slate-400 uppercase block">
                    Trigger Simulated Exception (Self-Healing Check)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => triggerSimulatedError('WebGL Context Lost Exception', 'high')}
                      className="bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 text-3xs py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ShieldAlert size={12} />
                      WebGL Crash
                    </button>
                    <button
                      onClick={() => triggerSimulatedError('Physics Solver NaN Constraint Exception', 'medium')}
                      className="bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 text-3xs py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Zap size={12} />
                      Physics Break
                    </button>
                  </div>
                </div>

                {/* Error Log */}
                <div className="bg-[#121626] border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <span className="text-3xs font-semibold text-slate-400 uppercase block border-b border-slate-800 pb-2">
                    Local Error Boundary Registry
                  </span>
                  <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                    {selectedInstance.errorLog.length === 0 ? (
                      <p className="text-3xs text-slate-500 text-center py-2">No active errors registered.</p>
                    ) : (
                      selectedInstance.errorLog.map((err, i) => (
                        <div key={i} className="flex items-start justify-between bg-[#191e32] p-2 rounded-lg text-3xs border border-slate-800/50">
                          <div>
                            <p className="font-semibold text-slate-300">{err.message}</p>
                            <span className="text-slate-500 font-mono">{err.timestamp}</span>
                          </div>
                          <span className={`font-bold font-mono ${err.solved ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                            {err.solved ? 'HEALED' : 'HEALING...'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          /* Logs Panel */
          <div className="bg-[#111422] border border-slate-800 rounded-2xl p-3 flex-1 flex flex-col h-[calc(100vh-160px)]">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
              <Terminal size={14} className="text-cyan-400" />
              <span className="text-3xs font-bold text-slate-400 uppercase">Live Architect Logs</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-3xs pr-1">
              {AGEA.getLogs().map((log, i) => (
                <div key={i} className="space-y-0.5 border-b border-slate-800/40 pb-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>[{log.type}]</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-slate-300 leading-normal">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
