import React, { useState } from 'react';
import { X, Search, Clock, ShieldCheck, AlertOctagon, AlertTriangle, Sparkles, Megaphone, ChevronRight } from 'lucide-react';

export default function HistoryDrawer({
  isOpen,
  onClose,
  history = [],
  onSelectRecord,
  activeRecordId,
}) {
  const [filterVerdict, setFilterVerdict] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const getVerdictBadge = (v) => {
    switch (v) {
      case 'TRUE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'FALSE':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'MISLEADING / OUT OF CONTEXT':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'CLICKBAIT EXAGGERATION':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'AI-GENERATED / ALTERED':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const filtered = history.filter((item) => {
    const matchesFilter = filterVerdict === 'ALL' || item.overall_verdict === filterVerdict;
    const textToSearch = `${item.raw_input || ''} ${item.url || ''} ${item.summary_explanation || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || textToSearch.includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Verification History & Cache
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/30">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search previous fact-checks..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex flex-wrap gap-1 text-[11px]">
            {['ALL', 'FALSE', 'TRUE', 'MISLEADING / OUT OF CONTEXT', 'AI-GENERATED / ALTERED'].map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterVerdict(tag)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterVerdict === tag
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tag === 'ALL' ? 'All' : tag === 'MISLEADING / OUT OF CONTEXT' ? 'Misleading' : tag === 'AI-GENERATED / ALTERED' ? 'AI' : tag}
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No verification records found.
            </div>
          ) : (
            filtered.map((rec) => {
              const isSelected = activeRecordId === rec.id;
              const displayText =
                rec.raw_input || rec.url || (rec.claims?.[0]?.claim_text) || 'Multimodal claim';

              return (
                <div
                  key={rec.id}
                  onClick={() => {
                    onSelectRecord(rec);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border ${getVerdictBadge(
                        rec.overall_verdict
                      )}`}
                    >
                      {rec.overall_verdict}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-slate-200 font-medium line-clamp-2 mb-2">
                    "{displayText}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Truth Confidence: {Math.round(rec.confidence_score)}%</span>
                    <div className="flex items-center gap-1 text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
