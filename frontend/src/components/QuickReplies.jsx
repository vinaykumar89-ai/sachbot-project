import React from 'react';
import { 
  RefreshCw, 
  Globe, 
  Share2, 
  LifeBuoy, 
  Download, 
  ArrowRight, 
  Search,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const CHIP_ICON_MAP = [
  { match: 're-verify', icon: RefreshCw },
  { match: 'reverify', icon: RefreshCw },
  { match: 'live', icon: RefreshCw },
  { match: 'domain', icon: Globe },
  { match: 'source', icon: Globe },
  { match: 'share', icon: Share2 },
  { match: 'card', icon: Share2 },
  { match: 'escalat', icon: LifeBuoy },
  { match: 'human', icon: LifeBuoy },
  { match: 'export', icon: Download },
  { match: 'transcript', icon: Download },
  { match: 'verify', icon: Search },
];

function getChipIcon(label) {
  if (!label) return Sparkles;
  const l = label.toLowerCase();
  for (const item of CHIP_ICON_MAP) {
    if (l.includes(item.match)) return item.icon;
  }
  return Sparkles;
}

export default function QuickReplies({ quickReplies = [], onSelectReply, disabled = false }) {
  if (!quickReplies || quickReplies.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pt-1 animate-in fade-in duration-300">
      <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase text-cyan-400/80">
        <Sparkles className="w-3 h-3 text-cyan-400" />
        <span>SUGGESTED_NEXT_ACTIONS // QUICK_DISPATCH</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {quickReplies.map((reply, idx) => {
          const Icon = getChipIcon(reply);
          const isHighlight = idx === 0 || reply.toLowerCase().includes('live');

          return (
            <button
              key={`${reply}-${idx}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectReply && onSelectReply(reply)}
              className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                isHighlight
                  ? 'bg-gradient-to-r from-cyan-950/60 to-[#0c1a2e] text-cyan-200 border-cyan-500/40 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                  : 'bg-[#0b1222]/80 text-slate-300 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-[#111c34] hover:text-cyan-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform duration-200" />
              <span>{reply}</span>
              <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-cyan-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
