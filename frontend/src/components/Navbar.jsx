import React, { useState } from 'react';
import { 
  ShieldCheck, 
  History, 
  Bot, 
  Sparkles, 
  Activity, 
  Radio, 
  Cpu, 
  RefreshCw, 
  Download,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isGeminiReady = healthData?.gemini_configured;

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-[#070b14]/90 backdrop-blur-md">
      {/* Top micro-line glow */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Robotic AI styling */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-950/80 ring-1 ring-cyan-400/50 shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent font-sans">
                Sachbot
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 truncate">
                AI FORENSICS v2.0
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-2">
              <span>SYS::ONLINE</span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-400/80">GROUNDING::ACTIVE</span>
            </p>
          </div>
        </div>

        {/* Desktop Controls (md and up) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-sm ${
              isPreviewMode
                ? 'bg-purple-500/20 text-purple-200 border-purple-400/50 shadow-purple-950/50 ring-1 ring-purple-400/30'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Toggle Preview / Audit Inspector Mode"
          >
            <Activity className={`w-3.5 h-3.5 ${isPreviewMode ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
            <span>AUDIT MODE:</span>
            <span>{isPreviewMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Export Transcript Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono font-semibold text-slate-200 transition-all shadow-sm"
            title="Export full session transcript"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT</span>
          </button>

          {/* Robo-Companion Toggle Button */}
          <button
            onClick={onToggleRobot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-sm ${
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-200 transition-all shadow-sm"
            title="View verification history"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">HISTORY</span>
          </button>
        </div>

        {/* Mobile Header Right: Status indicator + 44x44px Hamburger Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/20 text-[10px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-bold">ONLINE</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 hover:text-cyan-200 active:scale-95 transition-all shadow-sm"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu (< 768px) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-cyan-500/20 bg-[#080d19]/98 backdrop-blur-xl px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Audit Mode */}
            <button
              onClick={() => {
                onTogglePreview();
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold transition-all min-h-[44px] ${
                isPreviewMode
                  ? 'bg-purple-500/20 text-purple-200 border-purple-400/50'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800'
              }`}
            >
              <Activity className="w-4 h-4 text-purple-400" />
              <span>AUDIT: {isPreviewMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Unit-07 Companion */}
            <button
              onClick={() => {
                onToggleRobot();
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold transition-all min-h-[44px] ${
                robotEnabled
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>UNIT-07: {robotEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Export */}
            <button
              onClick={() => {
                onOpenExport();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-200 font-bold transition-all min-h-[44px]"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>EXPORT TRANSCRIPT</span>
            </button>

            {/* History */}
            <button
              onClick={() => {
                onOpenHistory();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-200 font-bold transition-all min-h-[44px]"
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>RECENT AUDITS</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span>ENGINE: {isGeminiReady ? 'GEMINI_2.5_REASONING' : 'GROUNDED_KNOWLEDGE'}</span>
            <span className="text-cyan-400 font-bold">{healthData?.cache_stats?.total_verifications || 0} AUDITS</span>
          </div>
        </div>
      )}
    </header>
  );
}
