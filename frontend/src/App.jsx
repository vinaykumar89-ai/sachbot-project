import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import PipelineProgress from './components/PipelineProgress.jsx';
import VerdictCard from './components/VerdictCard.jsx';
import ShareReceiptModal from './components/ShareReceiptModal.jsx';
import HistoryDrawer from './components/HistoryDrawer.jsx';
import RunAuditDrawer from './components/RunAuditDrawer.jsx';
import ExportTranscriptModal from './components/ExportTranscriptModal.jsx';
import RovingRobot from './components/RovingRobot.jsx';
import ClickRobotBurst from './components/ClickRobotBurst.jsx';
import { apiUrl } from './config/api.js';
import {
  AlertCircle,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Cpu,
  Radio,
  ShieldAlert,
  Activity,
  User,
  Bot,
  MessageSquare,
  Plus,
  ExternalLink,
  ImageIcon
} from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStage, setActiveStage] = useState(1);
  const [errorMsg, setErrorMsg] = useState(null);

  // Health and history
  const [healthData, setHealthData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isReverifying, setIsReverifying] = useState(false);

  // ChatBot.com inspired Workflow & UX states
  const [sessionId, setSessionId] = useState(() => {
    let sid = localStorage.getItem('sachbot_session_id');
    if (!sid) {
      sid = `sess_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
      localStorage.setItem('sachbot_session_id', sid);
    }
    return sid;
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeAuditLog, setActiveAuditLog] = useState([]);

  // Robotic companion toggles and telemetry
  const [robotEnabled, setRobotEnabled] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Last submitted query data for live re-verification & retry
  const [lastQueryData, setLastQueryData] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat feed to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch health check and recent history on mount
  const fetchHealthAndHistory = async () => {
    try {
      const hRes = await fetch(apiUrl('/api/health'));
      if (hRes.ok) {
        const hData = await hRes.json();
        setHealthData(hData);
      }

      const histRes = await fetch(apiUrl('/api/history?limit=30'));
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistoryList(histData);
      }
    } catch (err) {
      console.warn('API health check error:', err);
    }
  };

  useEffect(() => {
    fetchHealthAndHistory();
  }, []);

  // Clear conversation and start a new session
  const handleNewChat = () => {
    const newSid = `sess_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem('sachbot_session_id', newSid);
    setSessionId(newSid);
    setMessages([]);
    setActiveReport(null);
    setErrorMsg(null);
    setActiveAuditLog([]);
  };

  // Handle claim verification submission with conversational turn tracking
  const handleVerifyClaim = async (queryData, forceRefresh = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    setLastQueryData(queryData);
    if (forceRefresh) {
      setIsReverifying(true);
    }

    // Append user message to conversation stream
    const userTurn = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: queryData.text || '',
      url: queryData.url || null,
      imageUrl: queryData.imageFile ? URL.createObjectURL(queryData.imageFile) : null,
      imageName: queryData.imageFile?.name || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userTurn]);

    // Pipeline stage ticker for responsive visual feedback
    setActiveStage(1);
    const stageTimer1 = setTimeout(() => setActiveStage(2), 600);
    const stageTimer2 = setTimeout(() => setActiveStage(3), 1300);
    const stageTimer3 = setTimeout(() => setActiveStage(4), 2100);

    try {
      const formData = new FormData();
      if (queryData.text) formData.append('text', queryData.text);
      if (queryData.url) formData.append('url', queryData.url);
      if (queryData.language_pref) formData.append('language_pref', queryData.language_pref);
      if (forceRefresh) formData.append('force_refresh', 'true');

      // Session context payload
      formData.append('session_id', sessionId);
      formData.append('active_view', 'chat');
      const verdictIdToBind = queryData.last_verdict_id || activeReport?.id;
      if (verdictIdToBind) {
        formData.append('last_verdict_id', verdictIdToBind);
      }

      if (queryData.imageFile) {
        formData.append('image', queryData.imageFile, queryData.imageFile.name || 'image.jpg');
      }
      if (queryData.croppedBlob) {
        formData.append('cropped_image', queryData.croppedBlob, 'focus_crop.jpg');
      }

      const res = await fetch(apiUrl('/api/verify'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }

      const report = await res.json();
      setActiveReport(report);
      setActiveAuditLog(report.audit_log || []);
      setErrorMsg(null);

      // Append assistant response turn to conversation stream
      const asstTurn = {
        id: report.id || `asst_${Date.now()}`,
        role: 'assistant',
        report: report,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, asstTurn]);

      // If user has Preview / Audit mode active, automatically open the audit drawer
      if (isPreviewMode) {
        setIsAuditDrawerOpen(true);
      }

      // Refresh history & cache stats
      fetchHealthAndHistory();
    } catch (err) {
      console.error('Verification error:', err);
      let friendlyMsg = err.message || 'Fact-checking pipeline encountered an error. Please try again.';
      if (
        friendlyMsg.includes('Failed to fetch') ||
        friendlyMsg.includes('NetworkError') ||
        friendlyMsg.includes('gateway error') ||
        friendlyMsg.includes('cold sleep')
      ) {
        friendlyMsg = 'Backend service connection paused or waking from free-tier sleep (~45s on Render). Please wait a moment and click Retry Verification.';
      }
      setErrorMsg(friendlyMsg);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsLoading(false);
      setIsReverifying(false);
    }
  };

  const handleReverifyLive = () => {
    if (lastQueryData) {
      handleVerifyClaim(lastQueryData, true);
    } else if (activeReport) {
      handleVerifyClaim(
        {
          text: activeReport.raw_input || '',
          url: activeReport.url || '',
          language_pref: activeReport.detected_language || 'auto',
          last_verdict_id: activeReport.id,
        },
        true
      );
    }
  };

  // Quick-Reply Chip Click Handler
  const handleQuickReplySelect = (replyText) => {
    const textLower = replyText.toLowerCase();

    if (textLower.includes('re-verify') || textLower.includes('reverify')) {
      handleReverifyLive();
    } else if (textLower.includes('export') || textLower.includes('transcript')) {
      setIsExportModalOpen(true);
    } else if (textLower.includes('share') || textLower.includes('receipt') || textLower.includes('card')) {
      setIsReceiptModalOpen(true);
    } else if (textLower.includes('escalat') || textLower.includes('human')) {
      handleVerifyClaim({ text: "Please escalate this case to human editorial review" }, false);
    } else if (textLower.includes('domain') || textLower.includes('source')) {
      const target = activeReport?.url || 'theonion.com';
      handleVerifyClaim({ text: `Check domain reputation of ${target}`, url: activeReport?.url }, false);
    } else {
      handleVerifyClaim({ text: replyText }, false);
    }
  };

  // Card Action Button Handler (from RichActionCard)
  const handleCardAction = (act) => {
    if (!act) return;
    if (act.action === 'reverify') {
      handleReverifyLive();
    } else if (act.action === 'open_modal') {
      if (act.payload?.modal === 'export_transcript') {
        setIsExportModalOpen(true);
      } else if (act.payload?.modal === 'share_receipt') {
        setIsReceiptModalOpen(true);
      }
    } else if (act.action === 'send_message') {
      handleVerifyClaim({
        text: act.payload?.text,
        url: act.payload?.url
      }, false);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden w-full cyber-grid text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative">
      {/* Interactive Click-Spawned Cute Mini-Robots Burst */}
      <ClickRobotBurst enabled={robotEnabled} />

      {/* Roving Autonomous Robot Companion Unit-07 */}
      <RovingRobot
        enabled={robotEnabled}
        isLoading={isLoading}
        verdictData={activeReport}
        isTyping={isTyping}
        onToggle={() => setRobotEnabled(!robotEnabled)}
      />

      {/* Top Cyber Telemetry Navbar */}
      <Navbar
        onOpenHistory={() => setIsHistoryOpen(true)}
        healthData={healthData}
        robotEnabled={robotEnabled}
        onToggleRobot={() => setRobotEnabled(!robotEnabled)}
        isPreviewMode={isPreviewMode}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main Conversational Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10 flex flex-col">
        {/* If no messages yet: Welcome Hero */}
        {messages.length === 0 && (
          <section className="text-center max-w-3xl mx-auto space-y-3 py-6 animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono tracking-wide shadow-sm">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>AI_FORENSIC_RADAR // MULTIMODAL_CONVERSATIONAL_AGENT</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              Investigate & Adjudicate{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Viral Claims & Media
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto font-sans">
              Ask questions directly by texting like in Gemini or ChatGPT, or upload screenshots to fetch text, inspect origins, and verify empirical ground truth.
            </p>
          </section>
        )}

        {/* Conversation Stream Header (when active) */}
        {messages.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#070D1A]/80 border border-cyan-500/20 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-cyan-300 font-bold uppercase tracking-wide">
                ACTIVE_INVESTIGATION_THREAD
              </span>
              <span className="text-slate-600">{"/"}</span>
              <span className="text-slate-400 font-mono">
                {messages.length} TURNS
              </span>
            </div>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all font-mono text-[11px]"
              title="Start a fresh investigation session"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>New Investigation</span>
            </button>
          </div>
        )}

        {/* Conversational Message Stream */}
        {messages.length > 0 && (
          <div className="space-y-6 flex-1">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* User Turn */}
                {msg.role === 'user' && (
                  <div className="flex justify-end gap-3 max-w-3xl ml-auto">
                    <div className="space-y-2 max-w-2xl">
                      <div className="p-4 sm:p-5 rounded-3xl rounded-tr-sm bg-gradient-to-r from-slate-900 to-cyan-950/40 border border-cyan-500/30 text-slate-100 text-sm shadow-xl space-y-2">
                        {msg.text && (
                          <p className="leading-relaxed whitespace-pre-wrap font-sans">
                            {msg.text}
                          </p>
                        )}

                        {/* Uploaded Image Thumbnail */}
                        {msg.imageUrl && (
                          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/80 border border-cyan-500/30">
                            <img
                              src={msg.imageUrl}
                              alt="User uploaded attachment"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-800"
                            />
                            <div className="text-[11px] font-mono text-slate-300 truncate">
                              <span className="text-cyan-400 font-bold block">ATTACHED_MEDIA</span>
                              <span className="truncate">{msg.imageName || 'Attached Media'}</span>
                            </div>
                          </div>
                        )}

                        {/* Attached URL */}
                        {msg.url && (
                          <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono truncate">
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <a href={msg.url} target="_blank" rel="noopener noreferrer" className="underline truncate">
                              {msg.url}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="text-right text-[10px] font-mono text-slate-500 pr-2">
                        INVESTIGATOR • {msg.timestamp}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-md">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Assistant Turn */}
                {msg.role === 'assistant' && msg.report && (
                  <div className="flex items-start gap-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-md mt-1">
                      <Bot className="w-4 h-4" />
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Verdict Card with Fetched Data, Provenance Dossier, The Actual Fact, and Cognitive Correction */}
                      <VerdictCard
                        report={msg.report}
                        onShareReceipt={() => {
                          setActiveReport(msg.report);
                          setIsReceiptModalOpen(true);
                        }}
                        onReverifyLive={handleReverifyLive}
                        isReverifying={isReverifying}
                        onOpenAuditLog={() => {
                          setActiveReport(msg.report);
                          setActiveAuditLog(msg.report.audit_log || []);
                          setIsAuditDrawerOpen(true);
                        }}
                        onQuickReplySelect={handleQuickReplySelect}
                        onCardAction={handleCardAction}
                      />

                      <div className="text-[10px] font-mono text-slate-500 pl-2">
                        SACHBOT_VERIFIER • {msg.timestamp}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Live Autonomous Pipeline Progress Indicator */}
        {isLoading && (
          <div className="w-full space-y-3">
            <PipelineProgress activeStage={activeStage} />
          </div>
        )}

        {/* Actionable Error Alert Banner with Retry Button */}
        {errorMsg && (
          <div className="w-full p-4 sm:p-5 rounded-2xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-mono font-bold uppercase tracking-wider text-rose-300 text-[11px]">
                    PIPELINE_ERROR // VERIFICATION_HALTED
                  </h4>
                  <p className="text-slate-200 leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              </div>

              {lastQueryData && (
                <button
                  onClick={() => handleVerifyClaim(lastQueryData, true)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 text-white font-mono font-bold text-xs hover:bg-rose-600 transition-all shadow-md active:scale-95 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Retry Verification</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Anchor for Auto-Scroll */}
        <div ref={messagesEndRef} />

        {/* Interactive ChatGPT / Gemini Style Prompt Console */}
        <div className="pt-2">
          <ChatInterface
            onSubmitClaim={(q) => handleVerifyClaim(q, false)}
            isLoading={isLoading}
            onTypingChange={setIsTyping}
          />
        </div>
      </main>

      {/* Shareable Verification Receipt Modal */}
      <ShareReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        verdictData={activeReport}
      />

      {/* Run Audit Log Inspector Drawer */}
      <RunAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        auditLog={activeAuditLog}
        report={activeReport}
        sessionId={sessionId}
      />

      {/* Transcript Export Modal */}
      <ExportTranscriptModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sessionId={sessionId}
        report={activeReport}
      />

      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={historyList}
        onSelectRecord={(rec) => {
          setActiveReport(rec);
          setActiveAuditLog(rec.audit_log || []);
          setErrorMsg(null);
          setMessages((prev) => [
            ...prev,
            {
              id: `hist_${rec.id}`,
              role: 'assistant',
              report: rec,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }}
        activeRecordId={activeReport?.id}
      />

      {/* Footer */}
      <footer className="border-t border-cyan-500/10 bg-[#050811]/90 py-6 text-center text-xs text-slate-500 relative z-10 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">SACHBOT_ROBOTIC_FORENSICS</span>
            <span className="text-slate-600">{"//"}</span>
            <span className="text-slate-500">AUTONOMOUS MULTIMODAL AUDIT</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Empirical multi-agent truth grounding. Zero unverified assertions.
          </p>
        </div>
      </footer>
    </div>
  );
}
