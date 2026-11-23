import React, { useState } from 'react';
import { 
  Zap, 
  Globe, 
  LifeBuoy, 
  Share2, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  ChevronDown,
  Sparkles
} from 'lucide-react';

const SKILL_ICONS = {
  reverify_live: Zap,
  domain_audit: Globe,
  escalate_review: LifeBuoy,
  generate_share_card: Share2,
};

const BADGE_COLORS = {
  reverify_live: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/25',
  domain_audit: 'bg-purple-500/15 text-purple-300 border-purple-400/40 hover:bg-purple-500/25',
  escalate_review: 'bg-amber-500/15 text-amber-300 border-amber-400/40 hover:bg-amber-500/25',
  generate_share_card: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/25',
  default: 'bg-slate-500/15 text-slate-300 border-slate-400/40 hover:bg-slate-500/25'
};

export default function SkillBadge({ skill, showDetails = false }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!skill) return null;

  const skillKey = skill.skill_name || 'default';
  const IconComponent = SKILL_ICONS[skillKey] || Cpu;
  const colorClasses = BADGE_COLORS[skillKey] || BADGE_COLORS.default;
  const confPercent = Math.round((skill.confidence || 1.0) * 100);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono tracking-wide transition-all shadow-sm backdrop-blur-md cursor-pointer ${colorClasses}`}
        title={skill.reason || skill.summary}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <IconComponent className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold uppercase">{skill.display_name || skill.skill_name}</span>
        {confPercent > 0 && (
          <span className="text-[10px] opacity-75 ml-0.5 px-1 py-0.2 rounded bg-black/30 font-mono">
            {confPercent}%
          </span>
        )}
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Tooltip for Skill Metadata */}
      {isOpen && (
        <div 
          className="absolute left-0 mt-1.5 w-72 p-3 rounded-xl bg-[#090e1a]/95 border border-cyan-500/30 text-slate-200 text-xs shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-1.5 text-cyan-300 font-mono font-bold text-[11px] uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>SKILL_EXECUTION // {skill.skill_name}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {skill.status || 'EXECUTED'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Trigger Intent</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {skill.reason || "Autonomous Intent Classification"}
              </p>
            </div>

            {skill.summary && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Outcome Summary</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {skill.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
