import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Megaphone,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Share2,
  RefreshCw,
  Clock,
  CheckCircle2,
  FileText,
  Camera,
  Binary,
  Zap,
  Activity,
  Brain,
  Lightbulb,
  Compass,
  Target,
  Calendar,
  User,
  MapPin,
  ScanLine
} from 'lucide-react';
import HeadlineAuditBanner from './HeadlineAuditBanner.jsx';
import DiffViewer from './DiffViewer.jsx';
import SkillBadge from './SkillBadge.jsx';
import QuickReplies from './QuickReplies.jsx';
import RichActionCard from './RichActionCard.jsx';

export default function VerdictCard({
  report,
  onShareReceipt,
  onReverifyLive,
  isReverifying = false,
  onOpenAuditLog,
  onQuickReplySelect,
  onCardAction,
}) {
  if (!report) return null;

  const [expandedClaims, setExpandedClaims] = useState({});
  const [showForensics, setShowForensics] = useState(false);

  const {
    overall_verdict = 'UNVERIFIED',
    confidence_score = 75,
    summary_explanation = '',
    actual_fact = '',
    viewer_correction = null,
    fetched_image_data = null,
    image_origin_metadata = null,
    detected_language = 'en',
    claims = [],
    metadata = {},
    cards = [],
    quick_replies = [],
    triggered_skills = [],
    audit_log = [],
    is_cached = false,
    created_at = new Date().toISOString(),
    image_path = null,
  } = report;

  const realActualFact = actual_fact || metadata?.actual_fact || '';
  const realViewerCorrection = viewer_correction || metadata?.viewer_correction || null;
  const realFetchedImageData = fetched_image_data || metadata?.fetched_image_data || metadata?.visual_ocr || null;
  const realImageOrigin = image_origin_metadata || metadata?.image_origin_metadata || metadata?.image_forensics?.origin_dossier || null;

  const headlineAudit = metadata?.headline_audit;
  const imageDiff = metadata?.image_diff;
  const forensics = metadata?.image_forensics;
  const visualOcr = metadata?.visual_ocr;
  const domainRep = metadata?.domain_reputation;

  const toggleClaim = (idx) => {
    setExpandedClaims((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Verdict design configuration
  const getVerdictConfig = (v) => {
    switch (v) {
      case 'SKILL_TRIGGERED':
        return {
          icon: Zap,
          label: 'INTENT SKILL EXECUTED',
          bgGradient: 'from-cyan-950/70 via-slate-900 to-slate-950',
          borderColor: 'border-cyan-500/50',
          badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
          ringColor: 'ring-cyan-500/30',
          accentColor: 'text-cyan-400',
          progressColor: 'bg-cyan-500',
        };
      case 'TRUE / VERIFIED':
      case 'TRUE':
      case 'VERIFIED HISTORICAL RECORD':
        return {
          icon: ShieldCheck,
          label: 'VERIFIED TRUE',
          bgGradient: 'from-emerald-950/70 via-slate-900 to-slate-950',
          borderColor: 'border-emerald-500/50',
          badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          ringColor: 'ring-emerald-500/30',
          accentColor: 'text-emerald-400',
          progressColor: 'bg-emerald-500',
        };
      case 'FALSE / HOAX':
      case 'FALSE':
      case 'CONFIRMED FAKE / FALSE':
        return {
          icon: AlertOctagon,
          label: 'FALSE / HOAX',
          bgGradient: 'from-rose-950/70 via-slate-900 to-slate-950',
          borderColor: 'border-rose-500/50',
          badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          ringColor: 'ring-rose-500/30',
          accentColor: 'text-rose-400',
          progressColor: 'bg-rose-500',
        };
      case 'MISLEADING / OUT OF CONTEXT':
        return {
          icon: AlertTriangle,
          label: 'MISLEADING / OUT OF CONTEXT',
          bgGradient: 'from-amber-950/70 via-slate-900 to-slate-950',
          borderColor: 'border-amber-500/50',
          badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          ringColor: 'ring-amber-500/30',
          accentColor: 'text-amber-400',
          progressColor: 'bg-amber-500',
        };
      case 'CLICKBAIT EXAGGERATION':
        return {
          icon: Megaphone,
          label: 'CLICKBAIT EXAGGERATION',
          bgGradient: 'from-orange-950/70 via-slate-900 to-slate-950',
          borderColor: 'border-orange-500/50',
          badgeBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
          ringColor: 'ring-orange-500/30',
          accentColor: 'text-orange-400',
          progressColor: 'bg-orange-500',
        };
      case 'AI-GENERATED / ALTERED':
        return {
          icon: Sparkles,
          label: 'AI-GENERATED / ALTERED MEDIA',
          bgGradient: 'from-purple-950/70 via-slate-900 to-slate-950',
          borderColor: 'border-purple-500/50',
          badgeBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          ringColor: 'ring-purple-500/30',
          accentColor: 'text-purple-400',
          progressColor: 'bg-purple-500',
        };
      default:
        return {
          icon: HelpCircle,
          label: 'UNVERIFIED / INSUFFICIENT EVIDENCE',
          bgGradient: 'from-slate-900 via-slate-900 to-slate-950',
          borderColor: 'border-slate-700',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
          ringColor: 'ring-slate-700',
          accentColor: 'text-slate-400',
          progressColor: 'bg-slate-500',
        };
    }
  };

  const vConfig = getVerdictConfig(overall_verdict);
  const VerdictIcon = vConfig.icon;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Cache / Timestamp Notice */}
      {is_cached && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>
              Retrieved from Semantic Cache (Audited on {new Date(created_at).toLocaleString()})
            </span>
          </div>
          <button
            onClick={onReverifyLive}
            disabled={isReverifying}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReverifying ? 'animate-spin' : ''}`} />
            {isReverifying ? 'Re-verifying Live...' : 'Re-verify Live Grounding'}
          </button>
        </div>
      )}

      {/* Headline vs Body Audit Banner - Only rendered if headline audit was performed on a real URL */}
      {headlineAudit && headlineAudit.has_audit && Boolean(headlineAudit.headline) && (
        <HeadlineAuditBanner audit={headlineAudit} />
      )}

      {/* Side-by-Side Original vs Viral Diff - Only rendered if real diff context exists */}
      {imageDiff && Boolean(imageDiff.claimed_context || imageDiff.original_context) && (
        <DiffViewer diffData={imageDiff} viralImageUrl={image_path} />
      )}

      {/* Main Verdict Card */}
      <div
        className={`hud-card rounded-3xl border ${vConfig.borderColor} bg-gradient-to-b ${vConfig.bgGradient} p-6 sm:p-8 shadow-2xl relative overflow-hidden ring-1 ${vConfig.ringColor}`}
      >
        {/* Glow ambient background effect */}
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Triggered Skills Pill Badges */}
        {triggered_skills && triggered_skills.length > 0 && (
          <div className="relative z-10 flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-cyan-500/15">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>SKILLS:</span>
            </span>
            {triggered_skills.map((sk, idx) => (
              <SkillBadge key={idx} skill={sk} />
            ))}
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-cyan-500/20">
          {/* Verdict Title & Badge */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400">
                OFFICIAL_ADJUDICATION_TELEMETRY
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-mono text-slate-300">
                LANG::{detected_language.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`flex items-center gap-2.5 px-4.5 py-2.5 rounded-xl font-black text-sm sm:text-base tracking-wide border shadow-xl ${vConfig.badgeBg}`}
              >
                <VerdictIcon className="w-5 h-5 stroke-[2.5]" />
                <span className="font-mono">{vConfig.label}</span>
              </div>
            </div>
          </div>

          {/* Confidence Score Meter */}
          <div className="flex items-center gap-4 bg-[#050811]/90 p-3.5 rounded-2xl border border-cyan-500/20 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                CONFIDENCE_METER
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black font-mono ${vConfig.accentColor}`}>
                  {confidence_score}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-cyan-500/30 flex items-center justify-center relative">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs ${vConfig.accentColor} bg-[#050811]`}
              >
                {Math.round(confidence_score)}
              </div>
            </div>
          </div>
        </div>

        {/* Plain-Language Explanation with Direct Answer Callout */}
        <div className="relative z-10 py-6 border-b border-slate-800/80">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
            <FileText className="w-4 h-4 text-cyan-400" />
            Investigative Finding & Evidence Summary
          </h4>
          {summary_explanation.includes('\n\n') ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border-l-4 border-cyan-400 text-slate-100 text-sm sm:text-base font-medium leading-relaxed">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block mb-1 font-bold">
                  DIRECT_ANSWER // GROUND_TRUTH
                </span>
                {summary_explanation.split('\n\n')[0]}
              </div>
              <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-line">
                {summary_explanation.split('\n\n').slice(1).join('\n\n')}
              </p>
            </div>
          ) : (
            <p className="text-slate-100 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-line">
              {summary_explanation}
            </p>
          )}
        </div>

        {/* Fetched Image Data // Visual Intelligence Panel */}
        {realFetchedImageData && (realFetchedImageData.has_image_data || realFetchedImageData.extracted_text || realFetchedImageData.full_ocr) && (
          <div className="relative z-10 my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-blue-950/30 border border-cyan-500/40 shadow-xl shadow-cyan-950/30 backdrop-blur-md overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                    VISUAL_INTELLIGENCE // FETCHED_IMAGE_DATA
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Data Fetched from Uploaded Image
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                OCR_EXTRACTED
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              {(realFetchedImageData.extracted_text || realFetchedImageData.full_ocr) && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/20">
                  <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 block mb-1">
                    Detected Text / Headline in Image (OCR):
                  </span>
                  <p className="text-slate-100 font-mono text-xs sm:text-[13px] leading-relaxed">
                    "{realFetchedImageData.extracted_text || realFetchedImageData.full_ocr}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(realFetchedImageData.depicted_subject || realFetchedImageData.visual_description) && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                      Identified Subject:
                    </span>
                    <span className="text-white font-semibold text-xs sm:text-sm">
                      {realFetchedImageData.depicted_subject || realFetchedImageData.visual_description}
                    </span>
                  </div>
                )}

                {(realFetchedImageData.watermark_or_source || realFetchedImageData.brand_or_watermark) && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                      Watermark / Source Attribution:
                    </span>
                    <span className="text-cyan-300 font-mono text-xs sm:text-sm font-semibold">
                      {realFetchedImageData.watermark_or_source || realFetchedImageData.brand_or_watermark}
                    </span>
                  </div>
                )}
              </div>

              {realFetchedImageData.extracted_claim && (
                <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase shrink-0 font-bold">
                    Extracted Claim:
                  </span>
                  <span className="text-slate-200 text-xs italic">
                    {realFetchedImageData.extracted_claim}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image Origin & Provenance Dossier Panel */}
        {realImageOrigin && (realImageOrigin.has_origin_data || realImageOrigin.captured_date) && (
          <div className="relative z-10 my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-950/90 via-[#0B1323]/90 to-purple-950/20 border border-purple-500/35 shadow-xl shadow-purple-950/20 backdrop-blur-md overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-widest text-purple-400 uppercase">
                    IMAGE_PROVENANCE // METADATA_DOSSIER
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Image Origin, Date & Creator Details
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                ORIGIN_AUDIT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Date */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-purple-400 uppercase font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Captured / Creation Date:</span>
                </span>
                <p className="text-slate-100 font-medium text-xs sm:text-[13px]">
                  {realImageOrigin.captured_date || 'Date stripped by social platform'}
                </p>
              </div>

              {/* By Whom / Author */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>By Whom / Source:</span>
                </span>
                <p className="text-slate-100 font-medium text-xs sm:text-[13px]">
                  {realImageOrigin.by_whom || 'Author metadata stripped by social media'}
                </p>
              </div>

              {/* Camera / Device */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera / Device:</span>
                </span>
                <p className="text-slate-100 font-medium text-xs sm:text-[13px]">
                  {realImageOrigin.camera_or_device || 'Web Encoded Media'}
                </p>
              </div>

              {/* Location */}
              {realImageOrigin.location && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Location:</span>
                  </span>
                  <p className="text-slate-100 font-medium text-xs sm:text-[13px]">
                    {realImageOrigin.location}
                  </p>
                </div>
              )}

              {/* Dimensions */}
              {realImageOrigin.dimensions && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-teal-400 uppercase font-bold">
                    Resolution & Specs:
                  </span>
                  <p className="text-slate-100 font-mono text-xs">
                    {realImageOrigin.dimensions}
                  </p>
                </div>
              )}

              {/* Provenance Status */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 sm:col-span-2 lg:col-span-1">
                <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">
                  Platform Provenance Status:
                </span>
                <p className="text-slate-200 text-xs">
                  {realImageOrigin.provenance_integrity || 'Standard Social Compression'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* The Actual Fact // Ground Truth Reality Panel */}
        {realActualFact && (
          <div className="relative z-10 my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-cyan-950/30 border border-emerald-500/40 shadow-xl shadow-emerald-950/30 backdrop-blur-md overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    GROUND_TRUTH_REALITY // EMPIRICAL_FACT
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    The Actual Fact
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                VERIFIED_RECORD
              </span>
            </div>
            <p className="text-emerald-50 text-sm sm:text-base leading-relaxed font-medium">
              {realActualFact}
            </p>
          </div>
        )}

        {/* Viewer Cognitive Correction // Reality Check & Thought Calibration Panel */}
        {realViewerCorrection && (realViewerCorrection.misconception || realViewerCorrection.why_it_misleads || realViewerCorrection.corrected_perspective) && (
          <div className="relative z-10 my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#120F24]/90 via-[#0B101E]/90 to-[#10192A]/90 border border-amber-500/35 shadow-2xl shadow-purple-950/20 backdrop-blur-md overflow-hidden">
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                    COGNITIVE_CORRECTION // VIEWER_REALITY_CHECK
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Correcting Viewer Thoughts & Media Perception
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                MEDIA_LITERACY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              {/* Common Misconception */}
              {realViewerCorrection.misconception && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-500/25 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5" />
                    <span>Common Misconception</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed text-xs sm:text-[13px]">
                    {realViewerCorrection.misconception}
                  </p>
                </div>
              )}

              {/* Why This Misleads Viewers */}
              {realViewerCorrection.why_it_misleads && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/25 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Why This Misleads Viewers</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed text-xs sm:text-[13px]">
                    {realViewerCorrection.why_it_misleads}
                  </p>
                </div>
              )}

              {/* Corrected Viewer Perspective */}
              {realViewerCorrection.corrected_perspective && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-1.5 md:col-span-2">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Corrected Viewer Perspective</span>
                  </div>
                  <p className="text-cyan-50 font-medium leading-relaxed text-xs sm:text-[13px]">
                    {realViewerCorrection.corrected_perspective}
                  </p>
                </div>
              )}

              {/* Critical Thinking Rule */}
              {realViewerCorrection.critical_thinking_tip && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 md:col-span-2 flex items-start gap-2.5">
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                      CRITICAL_THINKING_RULE
                    </span>
                    <p className="text-emerald-100/90 text-xs sm:text-[13px] leading-relaxed">
                      {realViewerCorrection.critical_thinking_tip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rich Action Cards (e.g. Domain Audit, Escalation Ticket) */}
        {cards && cards.length > 0 && (
          <div className="relative z-10 py-4 border-b border-cyan-500/15 space-y-3">
            {cards.map((c, idx) => (
              <RichActionCard
                key={c.id || idx}
                card={c}
                onActionClick={onCardAction}
              />
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="relative z-10 pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {forensics && forensics.valid && Boolean(image_path) && (
              <button
                onClick={() => setShowForensics(!showForensics)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors font-mono"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                {showForensics ? 'Hide Forensics Details' : 'Inspect Forensic Metadata & ELA'}
              </button>
            )}

            {/* Inspect Run Log Button */}
            {onOpenAuditLog && (
              <button
                onClick={onOpenAuditLog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 text-purple-300 text-xs font-mono font-bold transition-all active:scale-95 shadow-sm"
                title="Inspect per-turn step-by-step audit trail and timing"
              >
                <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>Run Audit Log ({audit_log?.length || 0} steps)</span>
              </button>
            )}
          </div>

          <button
            onClick={onShareReceipt}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 font-mono"
          >
            <Share2 className="w-4 h-4" />
            Generate Shareable Receipt (PNG)
          </button>
        </div>

        {/* Contextual Quick Replies */}
        {quick_replies && quick_replies.length > 0 && (
          <div className="relative z-10 pt-5 mt-5 border-t border-cyan-500/15">
            <QuickReplies
              quickReplies={quick_replies}
              onSelectReply={onQuickReplySelect}
            />
          </div>
        )}
      </div>

      {/* Forensic Metadata Inspector Drawer/Accordion - Only rendered for uploaded images */}
      {showForensics && forensics && forensics.valid && Boolean(image_path) && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Binary className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Deep Media Forensics & Provenance Audit
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Format: {forensics.format} | Dimensions: {forensics.dimensions?.width}×{forensics.dimensions?.height}px
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* AI Generator Risk */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">AI Generation Fingerprint:</span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded ${
                    forensics.ai_provenance?.ai_risk === 'HIGH'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {forensics.ai_provenance?.ai_risk} RISK
                </span>
              </div>
              {forensics.ai_provenance?.ai_markers?.length > 0 && (
                <p className="text-[11px] text-purple-300 pt-1">
                  Detected signatures: {forensics.ai_provenance.ai_markers.join(', ')}
                </p>
              )}
            </div>

            {/* Perceptual Hashes */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">Perceptual Hashing (pHash):</span>
              <p className="font-mono text-slate-300 text-[11px] truncate">
                pHash: {forensics.hashes?.phash}
              </p>
              <p className="font-mono text-slate-400 text-[10px] truncate">
                dHash: {forensics.hashes?.dhash}
              </p>
            </div>

            {/* ELA Compression Check */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">Error Level Analysis (ELA):</span>
              <p className="text-slate-300 text-[11px]">
                Compression Error: {forensics.ela?.average_error_level}
              </p>
              <span
                className={`text-[10px] font-bold ${
                  forensics.ela?.compression_anomaly_detected ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {forensics.ela?.compression_anomaly_detected
                  ? 'Disparity detected (Possible text splicing)'
                  : 'Uniform compression'}
              </span>
            </div>
          </div>

          {/* EXIF Details if available */}
          {forensics.exif && Object.keys(forensics.exif).length > 0 && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold block mb-1">EXIF Camera & Software Tags:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                {Object.entries(forensics.exif).map(([k, v]) => (
                  <div key={k} className="truncate">
                    <span className="text-slate-500">{k}:</span> {String(v)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Claim-by-Claim Breakdown Accordion */}
      {claims && claims.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Claim-by-Claim Forensic Breakdown ({claims.length})
            </h3>
          </div>

          <div className="space-y-3">
            {claims.map((claim, idx) => {
              const isExpanded = expandedClaims[idx];
              const cConfig = getVerdictConfig(claim.verdict);
              const CIcon = cConfig.icon;

              return (
                <div
                  key={claim.id || idx}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/80 overflow-hidden shadow-lg transition-all"
                >
                  {/* Claim Card Header */}
                  <div
                    onClick={() => toggleClaim(idx)}
                    className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                        {idx + 1}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                            {claim.claim_type || 'Factual'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                          "{claim.claim_text}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${cConfig.badgeBg}`}
                      >
                        <CIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{claim.verdict}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Claim Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/50 space-y-4 text-xs animate-in fade-in duration-200">
                      <div>
                        <span className="text-slate-400 font-semibold block mb-1">
                          Adjudication Explanation:
                        </span>
                        <p className="text-slate-200 leading-relaxed">
                          {claim.explanation}
                        </p>
                      </div>

                      {/* Evidence Citations */}
                      {claim.sources && claim.sources.length > 0 && (
                        <div>
                          <span className="text-slate-400 font-semibold block mb-2">
                            Verified Evidence Sources:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {claim.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/60 transition-all flex flex-col justify-between group"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                                      {src.publisher || 'Official Source'}
                                    </span>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                  </div>
                                  <h5 className="font-semibold text-slate-200 line-clamp-2">
                                    {src.title}
                                  </h5>
                                </div>
                                {src.snippet && (
                                  <p className="text-[11px] text-slate-400 italic line-clamp-2 mt-2 pt-2 border-t border-slate-800/80">
                                    "{src.snippet}"
                                  </p>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
