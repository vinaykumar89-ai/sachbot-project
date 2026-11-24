import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Download, Copy, Check, X, Share2, Sparkles, AlertOctagon, ShieldAlert, Award } from 'lucide-react';

export default function ShareReceiptModal({
  isOpen,
  onClose,
  verdictData,
}) {
  const receiptRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !verdictData) return null;

  const {
    overall_verdict = "UNVERIFIED",
    confidence_score = 75,
    summary_explanation = "",
    claims = [],
    metadata = {},
    created_at = new Date().toISOString(),
    id = "SACH-001"
  } = verdictData;

  const topClaim = claims[0]?.claim_text || verdictData.raw_input || "Factual assertion";
  const citations = metadata?.shareable_receipt?.top_citations || [];

  // Determine badge styling and stamp color
  const getVerdictTheme = (v) => {
    switch (v) {
      case 'TRUE':
        return {
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500',
          bgColor: 'bg-emerald-500/10',
          stampClass: 'text-emerald-400 border-emerald-400 ring-emerald-500/30',
          label: 'VERIFIED TRUE',
          subLabel: 'Backed by primary official records'
        };
      case 'FALSE':
        return {
          textColor: 'text-rose-500',
          borderColor: 'border-rose-500',
          bgColor: 'bg-rose-500/10',
          stampClass: 'text-rose-500 border-rose-500 ring-rose-500/30',
          label: 'CONFIRMED FAKE / FALSE',
          subLabel: 'Debunked by verified fact-checkers'
        };
      case 'MISLEADING / OUT OF CONTEXT':
        return {
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500',
          bgColor: 'bg-amber-500/10',
          stampClass: 'text-amber-400 border-amber-400 ring-amber-500/30',
          label: 'MISLEADING / OUT OF CONTEXT',
          subLabel: 'Authentic media repurposed falsely'
        };
      case 'CLICKBAIT EXAGGERATION':
        return {
          textColor: 'text-orange-400',
          borderColor: 'border-orange-500',
          bgColor: 'bg-orange-500/10',
          stampClass: 'text-orange-400 border-orange-400 ring-orange-500/30',
          label: 'CLICKBAIT DISTORTION',
          subLabel: 'Headline unsupported by facts'
        };
      case 'AI-GENERATED / ALTERED':
        return {
          textColor: 'text-purple-400',
          borderColor: 'border-purple-500',
          bgColor: 'bg-purple-500/10',
          stampClass: 'text-purple-400 border-purple-400 ring-purple-500/30',
          label: 'SYNTHETIC / AI-GENERATED',
          subLabel: 'Synthetic generative fingerprints detected'
        };
      default:
        return {
          textColor: 'text-slate-400',
          borderColor: 'border-slate-500',
          bgColor: 'bg-slate-500/10',
          stampClass: 'text-slate-400 border-slate-400 ring-slate-500/30',
          label: 'UNVERIFIED',
          subLabel: 'Inconclusive primary evidence'
        };
    }
  };

  const theme = getVerdictTheme(overall_verdict);

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        backgroundColor: '#030712'
      });
      const link = document.createElement('a');
      link.download = `Sachbot_Verification_Receipt_${id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export receipt image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    const textToCopy = `🔍 SACHBOT VERIFICATION RECEIPT\n━━━━━━━━━━━━━━━━━━━━\nVERDICT: ${theme.label}\nTruth Confidence: ${confidence_score}%\n\nCLAIM AUDITED:\n"${topClaim}"\n\nINVESTIGATIVE SUMMARY:\n${summary_explanation}\n\nTOP CITATIONS:\n${citations.map(c => `• ${c.title} (${c.publisher})`).join('\n')}\n\nAudit ID: ${id}\nVerified by Sachbot Multimodal AI`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reportUrl = `${window.location.origin}/#audit-${id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Shareable Fact-Check Receipt
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950/90">
          {/* THE RECEIPT CARD (Target for html-to-image) */}
          <div
            ref={receiptRef}
            className="w-full max-w-[420px] bg-[#080d1a] border-2 border-slate-800 rounded-2xl p-6 shadow-2xl relative flex flex-col justify-between text-slate-100"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Top Brand Banner */}
            <div className="flex items-center justify-between pb-4 border-b border-dashed border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                    SACHBOT AUDIT RECEIPT
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Official Multimodal Fact Verification
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  REF: {id.slice(0, 8).toUpperCase()}
                </span>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                  {new Date(created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* GRAND RUBBER VERDICT STAMP */}
            <div className="py-4 my-2 flex flex-col items-center justify-center relative">
              <div
                className={`stamp-badge py-2 px-5 rounded-lg border-4 border-dashed text-center ${theme.stampClass}`}
              >
                <div className="text-lg font-black tracking-widest">{theme.label}</div>
                <div className="text-[10px] tracking-normal font-sans font-semibold mt-0.5 opacity-90">
                  {confidence_score}% FACTUAL CONFIDENCE
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium text-center mt-3">
                {theme.subLabel}
              </p>
            </div>

            {/* Audited Claim Excerpt */}
            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 mb-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Audited Claim:
              </span>
              <p className="text-xs font-semibold text-slate-200 line-clamp-3 italic">
                "{topClaim}"
              </p>
            </div>

            {/* Concise Finding */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Investigative Findings:
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-4">
                {summary_explanation}
              </p>
            </div>

            {/* Citations & QR Code Footer */}
            <div className="pt-3 border-t border-dashed border-slate-800 flex items-center justify-between gap-3 mt-auto">
              <div className="flex-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Primary Fact Sources:
                </span>
                <div className="space-y-0.5">
                  {citations.slice(0, 2).map((c, i) => (
                    <div key={i} className="text-[10px] text-emerald-400 truncate flex items-center gap-1 font-medium">
                      <span className="text-slate-500">•</span>
                      <span className="truncate">{c.publisher || c.title}</span>
                    </div>
                  ))}
                  {citations.length === 0 && (
                    <span className="text-[10px] text-slate-500">Government wire archives & IFCN database</span>
                  )}
                </div>
                <p className="text-[8px] font-mono text-slate-500 mt-2">
                  Grounding: Google Search & Fact Check Tools
                </p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center bg-white p-2 rounded-xl shrink-0 shadow-md">
                <QRCodeSVG
                  value={reportUrl}
                  size={60}
                  level="M"
                  includeMargin={false}
                />
                <span className="text-[7px] font-black text-slate-950 uppercase tracking-wider mt-1">
                  Scan to Verify
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            {copied ? 'Copied Fact Summary' : 'Copy Text Summary'}
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generating PNG...' : 'Download PNG for WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
