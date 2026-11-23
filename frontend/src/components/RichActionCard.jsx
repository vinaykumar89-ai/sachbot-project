import React from 'react';
import { 
  Globe, 
  LifeBuoy, 
  Share2, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Ticket,
  FileText
} from 'lucide-react';

const BADGE_VARIANTS = {
  cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
  amber: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  rose: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
};

const TYPE_ICONS = {
  domain_audit: Globe,
  escalation_ticket: Ticket,
  share_receipt: Share2,
  reverify_notice: Sparkles,
  default: ShieldCheck
};

export default function RichActionCard({ card, onActionClick }) {
  if (!card) return null;

  const Icon = TYPE_ICONS[card.type] || TYPE_ICONS.default;
  const badgeStyle = BADGE_VARIANTS[card.badge_variant] || BADGE_VARIANTS.cyan;

  return (
    <div className="hud-card rounded-2xl p-4 sm:p-5 my-3 text-slate-100 border border-cyan-500/25 shadow-xl backdrop-blur-md relative overflow-hidden transition-all hover:border-cyan-400/40">
      {/* Subtle top laser scan accent */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-cyan-500/15">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{card.title}</span>
            </h4>
            {card.subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                {card.subtitle}
              </p>
            )}
          </div>
        </div>

        {card.badge && (
          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold tracking-wider uppercase shrink-0 ${badgeStyle}`}>
            {card.badge}
          </span>
        )}
      </div>

      {/* Metrics Row (if present) */}
      {card.metrics && card.metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3.5">
          {card.metrics.map((m, idx) => (
            <div 
              key={idx}
              className="p-2.5 rounded-xl bg-black/30 border border-cyan-500/15 text-center flex flex-col justify-center"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 truncate block">
                {m.label}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-cyan-300 truncate mt-0.5 block">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Highlights List */}
      {card.highlights && card.highlights.length > 0 && (
        <div className="space-y-1.5 my-3">
          {card.highlights.map((hl, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{hl}</span>
            </div>
          ))}
        </div>
      )}

      {/* Link URL (if present) */}
      {card.link_url && (
        <div className="my-2.5 pt-1">
          <a
            href={card.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-mono"
          >
            <span>{card.link_text || 'Visit Audited Resource'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Card Action Buttons */}
      {card.actions && card.actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-2 border-t border-cyan-500/15">
          {card.actions.map((act, idx) => {
            const isPrimary = act.variant === 'primary' || idx === 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onActionClick && onActionClick(act)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shadow-sm active:scale-95 ${
                  isPrimary
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700'
                }`}
              >
                <span>{act.label}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
