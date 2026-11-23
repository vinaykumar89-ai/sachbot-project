import React from 'react';
import { Search, Brain, FileCheck, ShieldAlert, CheckCircle2, Loader2, Radio, Activity } from 'lucide-react';

export default function PipelineProgress({ activeStage = 1 }) {
  const stages = [
    {
      id: 1,
      code: "STG::01",
      title: "Multimodal Normalizer",
      desc: "Text sanitizing, OCR, social link extraction, domain WHOIS & image forensics",
      icon: Search,
    },
    {
      id: 2,
      code: "STG::02",
      title: "Atomic Claim Extractor",
      desc: "Extracting factual dates, statistics, quotes & filtering subjective rhetoric",
      icon: Brain,
    },
    {
      id: 3,
      code: "STG::03",
      title: "Evidence & Grounding",
      desc: "Querying Google Search Grounding, IFCN databases & visual origin traces",
      icon: FileCheck,
    },
    {
      id: 4,
      code: "STG::04",
      title: "Adjudicator & Diff Engine",
      desc: "Computing truth scores, diffing original context & assigning final verdict badge",
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="hud-card scanline-overlay w-full rounded-2xl p-5 shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
      {/* Animated laser scan beam */}
      <div className="scanline-laser" />

      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-500/20 relative z-10">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <h3 className="text-sm font-mono font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            AUTONOMOUS_PIPELINE_IN_EXECUTION
          </h3>
        </div>
        <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/30">
          STAGE 0{activeStage} / 04
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative z-10">
        {stages.map((st) => {
          const Icon = st.icon;
          const isDone = activeStage > st.id;
          const isCurrent = activeStage === st.id;
          const isPending = activeStage < st.id;

          return (
            <div
              key={st.id}
              className={`relative rounded-xl p-3.5 border transition-all duration-300 font-sans ${
                isCurrent
                  ? 'bg-cyan-950/40 border-cyan-400/60 shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-400/40'
                  : isDone
                  ? 'bg-slate-950/60 border-cyan-900/40 text-slate-400'
                  : 'bg-slate-950/30 border-slate-800/40 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400/80">
                  {st.code}
                </span>
                {isCurrent && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>

              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
                      : isDone
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <h4
                  className={`text-xs font-bold ${
                    isCurrent ? 'text-cyan-200' : isDone ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {st.title}
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pl-9">
                {st.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
