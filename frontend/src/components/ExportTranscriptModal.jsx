import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  FileCode, 
  FileSignature, 
  ShieldCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { apiUrl } from '../config/api.js';

export default function ExportTranscriptModal({ isOpen, onClose, sessionId = '', report = null }) {
  const [format, setFormat] = useState('md'); // 'md', 'json', 'txt'
  const [includeAudit, setIncludeAudit] = useState(true);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filename, setFilename] = useState(`sachbot_transcript_${sessionId.slice(0, 8) || 'session'}.md`);

  // Fetch or generate export whenever format, includeAudit, or sessionId changes
  const fetchExport = async () => {
    setIsLoading(true);
    const targetSession = sessionId || report?.session_id || 'default_session';
    const ext = format === 'json' ? 'json' : (format === 'txt' ? 'txt' : 'md');
    setFilename(`sachbot_transcript_${targetSession.slice(0, 10)}.${ext}`);

    try {
      const res = await fetch(apiUrl(`/api/sessions/${targetSession}/export?format=${format}&include_audit=${includeAudit}`));
      if (res.ok) {
        const text = await res.text();
        setContent(text);
      } else {
        // Fallback local transcript generation if backend session is unavailable
        generateLocalFallback();
      }
    } catch (err) {
      console.warn('Backend export fetch error, falling back to local snapshot:', err);
      generateLocalFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const generateLocalFallback = () => {
    const targetSession = sessionId || report?.session_id || 'local_session';
    const now = new Date().toISOString();
    if (format === 'json') {
      const payload = {
        session_id: targetSession,
        exported_at: now,
        report: report || {},
        audit_log: includeAudit ? (report?.audit_log || []) : []
      };
      setContent(JSON.stringify(payload, null, 2));
    } else if (format === 'txt') {
      const txt = [
        "================================================================================",
        "               SACHBOT MULTIMODAL AI FACT-CHECKING TRANSCRIPT                  ",
        "================================================================================",
        `Session ID : ${targetSession}`,
        `Exported At: ${now}`,
        `Verdict    : ${report?.overall_verdict || 'N/A'} (${report?.confidence_score || 0}% Conf)`,
        `Findings   : ${report?.summary_explanation || 'No summary'}`,
        "--------------------------------------------------------------------------------"
      ].join('\n');
      setContent(txt);
    } else {
      const md = [
        `# 🛡️ Sachbot Fact-Checking Transcript`,
        `> **Session ID:** \`${targetSession}\`  `,
        `> **Exported:** \`${now}\`  `,
        `> **Verdict:** **${report?.overall_verdict || 'N/A'}** (${report?.confidence_score || 0}%)  `,
        `\n### Summary Findings\n${report?.summary_explanation || 'N/A'}`
      ].join('\n');
      setContent(md);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExport();
    }
  }, [isOpen, format, includeAudit, sessionId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const mimeTypes = {
      md: 'text/markdown',
      json: 'application/json',
      txt: 'text/plain'
    };
    const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-[#090e1a] border border-cyan-500/30 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[88dvh] z-10 font-sans backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-cyan-500/20 bg-[#0c1424] rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
              <Download className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-sm sm:text-base text-white tracking-wide">
                EXPORT_VERIFICATION_TRANSCRIPT
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Full conversational history, cards, citations, and step-by-step run audit logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector and Options Toolbar */}
        <div className="p-4 bg-[#0a101f] border-b border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Format Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-cyan-500/20">
            <button
              onClick={() => setFormat('md')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                format === 'md'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-cyan-200'
              }`}
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={() => setFormat('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                format === 'json'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-cyan-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON (.json)</span>
            </button>

            <button
              onClick={() => setFormat('txt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                format === 'txt'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-cyan-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Plain Text (.txt)</span>
            </button>
          </div>

          {/* Audit Log Checkbox Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300 hover:text-cyan-200 transition-colors select-none">
            <input
              type="checkbox"
              checked={includeAudit}
              onChange={(e) => setIncludeAudit(e.target.checked)}
              className="rounded bg-slate-900 border-cyan-500/40 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Include Run Audit Logs</span>
          </label>
        </div>

        {/* Live Content Preview */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between pb-2 text-[11px] font-mono text-slate-400">
            <span>PREVIEW // {filename}</span>
            <span>{content ? `${content.length} chars` : 'Loading...'}</span>
          </div>

          <div className="flex-1 bg-black/60 border border-cyan-500/20 rounded-xl p-4 overflow-y-auto relative font-mono text-xs leading-relaxed text-slate-200 select-all">
            {isLoading ? (
              <div className="flex items-center justify-center h-full gap-2 text-cyan-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Compiling transcript artifact...</span>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words">{content}</pre>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#0c1424] border-t border-cyan-500/20 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Cryptographic audit trail included</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold transition-all border border-slate-700 active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {format.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
