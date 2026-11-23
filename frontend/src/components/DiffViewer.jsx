import React, { useState } from 'react';
import { Split, Calendar, MapPin, Tag, ExternalLink, ArrowRight, Eye } from 'lucide-react';

export default function DiffViewer({ diffData, viralImageUrl }) {
  if (!diffData) return null;

  const {
    claimed_context,
    original_context,
    claimed_date,
    original_date,
    claimed_location,
    original_location,
    original_image_url,
    summary_diff,
  } = diffData;

  const [activeTab, setActiveTab] = useState('side-by-side'); // 'side-by-side' | 'details'

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 mb-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Split className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              Side-by-Side Context Diff
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                Recycled / Out-of-Context Media
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Visual provenance tracing discovered the earliest genuine source of this viral image.
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('side-by-side')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'side-by-side'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Visual Comparison
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'details'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Metadata Matrix
          </button>
        </div>
      </div>

      {/* Visual Side-by-Side Comparison */}
      {activeTab === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Viral Uploaded Media */}
          <div className="rounded-xl border border-rose-500/30 bg-slate-950/80 p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                  Viral Claimed Media
                </span>
                <span className="text-[11px] font-mono text-slate-400">Current Circulation</span>
              </div>
              <div className="aspect-video w-full rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-800 relative">
                {viralImageUrl ? (
                  <img
                    src={viralImageUrl}
                    alt="Viral upload"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-slate-500 flex flex-col items-center gap-1">
                    <Eye className="w-5 h-5 text-slate-600" />
                    <span>Viral Post Media</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1.5">
              <div className="flex items-start gap-1.5 text-slate-300">
                <Tag className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-rose-300">Claimed:</strong> {claimed_context || "Viral narrative"}
                </span>
              </div>
              {claimed_date && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Claimed Date: {claimed_date}</span>
                </div>
              )}
            </div>
          </div>

          {/* Original Source Media */}
          <div className="rounded-xl border border-emerald-500/30 bg-slate-950/80 p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Earliest Verified Source
                </span>
                <span className="text-[11px] font-mono text-emerald-400">Archival Origin</span>
              </div>
              <div className="aspect-video w-full rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-800 relative">
                {original_image_url ? (
                  <img
                    src={original_image_url}
                    alt="Original source"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-slate-500 flex flex-col items-center gap-1 p-4 text-center">
                    <Calendar className="w-6 h-6 text-emerald-500/60" />
                    <span className="text-slate-300 font-semibold">{original_context}</span>
                    <span className="text-[11px] text-slate-500">First archived: {original_date}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1.5">
              <div className="flex items-start gap-1.5 text-slate-300">
                <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-emerald-300">Actual Origin:</strong> {original_context}
                </span>
              </div>
              {original_date && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>True Date: {original_date}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Metadata Matrix */
        <div className="overflow-x-auto rounded-xl border border-slate-800 mb-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Forensic Dimension</th>
                <th className="py-2.5 px-4 text-rose-400">Viral Claimed Context</th>
                <th className="py-2.5 px-4 text-emerald-400">Original Verified Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-400">Event Narrative</td>
                <td className="py-2.5 px-4 text-rose-300">{claimed_context || "Current news event"}</td>
                <td className="py-2.5 px-4 text-emerald-300 font-medium">{original_context}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-400">Publication Date</td>
                <td className="py-2.5 px-4 font-mono text-slate-300">{claimed_date || "Recent"}</td>
                <td className="py-2.5 px-4 font-mono text-emerald-400 font-bold">{original_date || "Historical"}</td>
              </tr>
              {original_location && (
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Location</td>
                  <td className="py-2.5 px-4 text-slate-300">{claimed_location || "Unspecified"}</td>
                  <td className="py-2.5 px-4 text-emerald-400">{original_location}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Diff Explanation */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
        <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-amber-300">Investigative Finding:</strong> {summary_diff}
        </p>
      </div>
    </div>
  );
}
