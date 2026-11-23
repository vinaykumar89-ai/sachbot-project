import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  Database, 
  Zap, 
  Search, 
  ShieldCheck, 
  FileText, 
  Activity, 
  Copy, 
  Check, 
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const STEP_ICONS = {
  session_context: Layers,
  skill_router: Zap,
  cache_lookup: Database,
  normalizer_ocr: FileText,
  claim_extractor: Search,
  evidence_lookup: Search,
  adjudicator: ShieldCheck,
  default: Activity
};

const STATUS_BADGES = {
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  cached: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
  fallback: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  skipped: 'bg-slate-500/20 text-slate-400 border-slate-600/40',
  error: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
};

export default function RunAuditDrawer({ isOpen, onClose, auditLog = [], report = null, sessionId = '' }) {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!isOpen) return null;

  const steps = (auditLog && auditLog.length > 0) ? auditLog : (report?.audit_log || []);
  const totalDuration = steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);
  const triggeredSkills = report?.triggered_skills || [];

  const handleCopyJson = () => {
    const payload = {
      session_id: sessionId || report?.session_id,
      total_duration_ms: totalDuration,
      audit_log: steps,
      triggered_skills: triggeredSkills,
      report_verdict: report?.overall_verdict,
      confidence_score: report?.confidence_score
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-xl bg-[#070b14]/95 border-l border-cyan-500/30 text-slate-100 shadow-2xl flex flex-col h-full z-10 font-sans backdrop-blur-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 bg-[#090f1d]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-sm text-white tracking-wide flex items-center gap-2">
                <span>RUN_AUDIT_INSPECTOR</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  LIVE_LOG
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Session: {sessionId || report?.session_id || 'Active'} • {steps.length} Pipeline Stages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="p-1.5 rounded-lg border border-cyan-500/20 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              title="Copy Audit JSON"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Bar */}
        <div className="px-5 py-3 bg-[#0d1526]/60 border-b border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Total Run Time:</span>
            <span className="font-bold text-cyan-300">{totalDuration}ms</span>
          </div>

          {report?.overall_verdict && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Final Verdict:</span>
              <span className="font-bold text-amber-300">{report.overall_verdict}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-slate-300">
                {report.confidence_score}% Conf
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Phase Latency Waterfall Bar */}
          {steps.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-xl bg-black/40 border border-cyan-500/15">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>STAGE_EXECUTION_WATERFALL</span>
                <span className="text-cyan-400">{totalDuration}ms Total</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-900/80 overflow-hidden flex border border-slate-700/50">
                {steps.map((st, i) => {
                  const pct = totalDuration > 0 ? Math.max(3, Math.round((st.duration_ms / totalDuration) * 100)) : 10;
                  const colors = [
                    'bg-cyan-500', 'bg-purple-500', 'bg-blue-500', 
                    'bg-amber-500', 'bg-emerald-500', 'bg-teal-400'
                  ];
                  const barColor = colors[i % colors.length];
                  return (
                    <div 
                      key={i} 
                      style={{ width: `${pct}%` }} 
                      className={`${barColor} h-full transition-all`} 
                      title={`${st.step_name}: ${st.duration_ms}ms (${pct}%)`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Triggered Skills Highlight Section */}
          {triggeredSkills.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>INTENT_SKILLS_TRIGGERED ({triggeredSkills.length})</span>
              </div>
              <div className="grid gap-2">
                {triggeredSkills.map((sk, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">
                          {sk.display_name || sk.skill_name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300">
                          {Math.round((sk.confidence || 1) * 100)}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {sk.reason || sk.summary}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      {sk.status || 'EXECUTED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Ordered Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>EXECUTION_STEPS_TIMELINE</span>
              </span>
              <span className="text-[11px] text-slate-500">{steps.length} recorded</span>
            </div>

            {steps.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                No audit steps recorded for this inquiry yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {steps.map((step, idx) => {
                  const Icon = STEP_ICONS[step.step_name] || STEP_ICONS.default;
                  const statusStyle = STATUS_BADGES[step.status] || STATUS_BADGES.success;

                  return (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#0b1222] border border-cyan-500/20 hover:border-cyan-400/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-cyan-400 font-bold">#{idx + 1}</span>
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-200">{step.step_name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${statusStyle}`}>
                            {step.status}
                          </span>
                          <span className="text-xs font-mono text-cyan-400 shrink-0">
                            {step.duration_ms}ms
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 font-sans leading-relaxed pl-5">
                        {step.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Raw JSON Debug Viewer */}
          <div className="pt-2">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>{showRawJson ? '[-] Hide Raw Telemetry JSON' : '[+] Inspect Raw Telemetry JSON'}</span>
            </button>

            {showRawJson && (
              <pre className="mt-2 p-3 rounded-xl bg-black/60 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-60 leading-relaxed">
                {JSON.stringify({ audit_log: steps, report }, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#090f1d]/80 text-center text-xs font-mono text-slate-400 shrink-0">
          <span>Sachbot Multi-Agent Telemetry • Transparent Verification Audit</span>
        </div>
      </div>
    </div>
  );
}
