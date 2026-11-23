import React from 'react';
import { 
  ShieldCheck, 
  History, 
  Bot, 
  Sparkles, 
  Activity, 
  Radio, 
  Cpu, 
  RefreshCw, 
  Download 
} from 'lucide-react';

export default function Navbar({
  onOpenHistory,
  healthData,
  robotEnabled = true,
  onToggleRobot,
  isPreviewMode = false,
  onTogglePreview,
  onOpenExport,
}) {
  const isGeminiReady = healthData?.gemini_configured;

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-[#070b14]/90 backdrop-blur-md">
      {/* Top micro-line glow */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Robotic AI styling */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-950/80 ring-1 ring-cyan-400/50">
            <ShieldCheck className="w-6 h-6 text-white stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent font-sans">
                Sachbot
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                AI FORENSICS v2.0
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-2">
              <span>SYS::ONLINE</span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-400/80">GROUNDING::ACTIVE</span>
            </p>
          </div>
        </div>

        {/* Right Actions & Health Indicators */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Telemetry Micro Status */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/20 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isGeminiReady ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-slate-200">
                {isGeminiReady ? 'GEMINI_2.5_REASONING' : 'GROUNDED_KNOWLEDGE_ENGINE'}
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              {healthData?.cache_stats?.total_verifications || 0} AUDITS
            </span>
          </div>

          {/* Preview / Audit Inspector Mode Toggle */}
          <button
            onClick={onTogglePreview}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-sm ${
              isPreviewMode
                ? 'bg-purple-500/20 text-purple-200 border-purple-400/50 shadow-purple-950/50 ring-1 ring-purple-400/30'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Toggle Preview / Audit Inspector Mode to inspect per-turn execution logs and timing waterfall"
          >
            <Activity className={`w-3.5 h-3.5 ${isPreviewMode ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden md:inline">AUDIT MODE:</span>
            <span>{isPreviewMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Export Transcript Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono font-semibold text-slate-200 transition-all shadow-sm"
            title="Export full session transcript as Markdown, JSON, or Plain Text"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">EXPORT</span>
          </button>

          {/* Robo-Companion Toggle Button */}
          <button
            onClick={onToggleRobot}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-sm ${
              robotEnabled
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-cyan-950/50 ring-1 ring-cyan-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle autonomous roving robot companion Unit-07"
          >
            <Bot className={`w-3.5 h-3.5 ${robotEnabled ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden lg:inline">UNIT-07:</span>
            <span>{robotEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-200 transition-all shadow-sm"
            title="View verification history and cached claims"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-mono">HISTORY</span>
          </button>
        </div>
      </div>
    </header>
  );
}
