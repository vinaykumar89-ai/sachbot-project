import React from 'react';
import { AlertTriangle, CheckCircle, Flame, FileText, ArrowRight } from 'lucide-react';

export default function HeadlineAuditBanner({ audit }) {
  if (!audit || !audit.has_audit) return null;

  const { headline, sensationalism_score, is_mismatch, audit_notes, sensational_phrases } = audit;

  const isHighClickbait = sensationalism_score >= 50;

  return (
    <div
      className={`rounded-2xl border p-4.5 mb-6 transition-all ${
        is_mismatch
          ? 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20'
          : isHighClickbait
          ? 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-950/20'
          : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              is_mismatch
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : isHighClickbait
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {is_mismatch ? (
              <AlertTriangle className="w-4 h-4" />
            ) : isHighClickbait ? (
              <Flame className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              Headline vs. Article Audit
              {is_mismatch && (
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                  Headline Contradiction Detected
                </span>
              )}
            </h4>
          </div>
        </div>

        {/* Sensationalism Score */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Headline Sensationalism:</span>
          <div className="flex items-center gap-1.5 font-mono font-bold">
            <span
              className={
                isHighClickbait ? 'text-amber-400' : 'text-emerald-400'
              }
            >
              {sensationalism_score}%
            </span>
            <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isHighClickbait
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, sensationalism_score))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Headline & Notes */}
      <div className="space-y-2 text-xs">
        <div>
          <span className="text-slate-400 font-semibold block mb-0.5">Audited Headline:</span>
          <p className="text-slate-100 font-medium italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            "{headline}"
          </p>
        </div>

        <p className="text-slate-300 leading-relaxed pt-1">
          {audit_notes}
        </p>

        {sensational_phrases && sensational_phrases.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Sensationalist trigger terms:</span>
            {sensational_phrases.map((phrase, i) => (
              <span
                key={i}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20"
              >
                "{phrase}"
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
