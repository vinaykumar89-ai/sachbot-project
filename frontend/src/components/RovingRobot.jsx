import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, X, Minimize2, Maximize2, Zap, Radio, ShieldCheck } from 'lucide-react';

export default function RovingRobot({
  enabled = true,
  isLoading = false,
  verdictData = null,
  isTyping = false,
  onToggle,
}) {
  const [position, setPosition] = useState({ x: 40, y: 0 }); // Bottom offset
  const [direction, setDirection] = useState(1); // 1 = moving right, -1 = moving left
  const [isDocked, setIsDocked] = useState(false);
  const [speechText, setSpeechText] = useState('Unit-07 online. Truth radar active.');
  const [showSpeech, setShowSpeech] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [spinCount, setSpinCount] = useState(0);

  const animFrameRef = useRef(null);
  const speechTimeoutRef = useRef(null);

  // Reaction to page events
  useEffect(() => {
    if (isLoading) {
      setSpeechText('Forensic sensors scanning... Ingesting live groundings!');
      setShowSpeech(true);
    } else if (verdictData) {
      const v = verdictData.overall_verdict;
      if (v === 'FALSE') {
        setSpeechText('BEEP-ALERT! Fabrication detected in viral claim!');
      } else if (v === 'TRUE') {
        setSpeechText('Verified genuine! Truth signature confirmed.');
      } else if (v === 'AI-GENERATED / ALTERED') {
        setSpeechText('Synthetic AI signatures isolated in media!');
      } else if (v === 'MISLEADING / OUT OF CONTEXT') {
        setSpeechText('Context mismatch! Media repurposed falsely.');
      } else {
        setSpeechText('Investigation compiled. Telemetry ready!');
      }
      setShowSpeech(true);
      // Auto-hide speech bubble after 5s
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => setShowSpeech(false), 5500);
    } else if (isTyping) {
      setSpeechText('Tracking input assertions... Ready for deep search.');
      setShowSpeech(true);
    }
  }, [isLoading, verdictData, isTyping]);

  // Smooth roving motion
  useEffect(() => {
    if (!enabled || isDocked || isHovered || isLoading) return;

    let currentX = position.x;
    let currentDir = direction;
    const speed = 0.65; // Pixels per frame

    const moveBot = () => {
      const screenWidth = window.innerWidth;
      const minX = 30;
      const maxX = Math.max(minX + 100, screenWidth - 140);

      currentX += speed * currentDir;

      if (currentX >= maxX) {
        currentX = maxX;
        currentDir = -1;
        setDirection(-1);
      } else if (currentX <= minX) {
        currentX = minX;
        currentDir = 1;
        setDirection(1);
      }

      setPosition((prev) => ({ ...prev, x: currentX }));
      animFrameRef.current = requestAnimationFrame(moveBot);
    };

    animFrameRef.current = requestAnimationFrame(moveBot);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [enabled, isDocked, isHovered, isLoading, direction]);

  const handleBotClick = () => {
    setSpinCount((prev) => prev + 1);
    const quips = [
      'Unit-07 at your service! Zero hallucinations permitted.',
      'Scanning for digital artifacts & cheapfakes...',
      'Grounded via Google Search & official fact databases!',
      'Hinglish, screenshots, or videos—I audit them all!',
      'Fact-check receipt ready for WhatsApp deployment!'
    ];
    const nextQuip = quips[Math.floor(Math.random() * quips.length)];
    setSpeechText(nextQuip);
    setShowSpeech(true);
  };

  if (!enabled) return null;

  const verdict = verdictData?.overall_verdict;
  const isAlarm = verdict === 'FALSE' || verdict === 'AI-GENERATED / ALTERED';
  const isHappy = verdict === 'TRUE';

  return (
    <div
      className={`fixed z-30 transition-all duration-300 select-none pointer-events-none sm:pointer-events-auto ${
        isDocked ? 'bottom-5 right-5' : 'bottom-3 sm:bottom-4'
      }`}
      style={{
        left: isDocked ? 'auto' : `${position.x}px`,
        transform: `translateY(${position.y}px)`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Speech Bubble */}
      {showSpeech && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 min-w-[190px] max-w-[240px] sm:max-w-[260px] bg-slate-900/95 border border-cyan-400/40 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-medium text-cyan-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none sm:pointer-events-auto">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              UNIT-07 // TELEMETRY
            </span>
            <button
              onClick={() => setShowSpeech(false)}
              className="text-slate-500 hover:text-slate-300 p-0.5 pointer-events-auto"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
          <p className="leading-snug text-slate-100">{speechText}</p>
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-cyan-400/40 rotate-45" />
        </div>
      )}

      {/* Roving Robot Body */}
      <div
        onClick={handleBotClick}
        className="group relative cursor-pointer flex flex-col items-center pointer-events-auto"
      >
        {/* Scanning Cone when loading */}
        {isLoading && (
          <div className="absolute -top-16 w-32 h-16 pointer-events-none overflow-hidden flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-b from-cyan-400/20 via-cyan-400/5 to-transparent clip-path-cone animate-pulse" />
          </div>
        )}

        {/* The SVG Robot */}
        <div
          className={`relative transition-transform duration-300 ${
            direction === -1 && !isDocked ? '-scale-x-100' : 'scale-x-100'
          }`}
          style={{
            transform: `rotate(${spinCount * 360}deg)`,
            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_12px_rgba(0,240,255,0.4)] hover:drop-shadow-[0_0_18px_rgba(0,240,255,0.7)] transition-all"
          >
            {/* Hover Glow Ring */}
            <circle cx="32" cy="56" r="16" fill="rgba(0, 240, 255, 0.15)" />
            <ellipse cx="32" cy="56" rx="12" ry="3" fill="#00f0ff" opacity="0.6" className="animate-pulse" />

            {/* Antenna with Blinking LED */}
            <line x1="32" y1="14" x2="32" y2="4" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
            <circle
              cx="32"
              cy="4"
              r="3.5"
              fill={isAlarm ? '#f43f5e' : isLoading ? '#00f0ff' : '#10b981'}
              className="animate-pulse"
            />

            {/* Head / Helmet */}
            <rect x="16" y="14" width="32" height="24" rx="8" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />

            {/* Visor Screen */}
            <rect x="20" y="19" width="24" height="14" rx="5" fill="#030712" />

            {/* Expressive Eyes / Scan Visor */}
            {isLoading ? (
              // Scanning laser sweep
              <g className="animate-pulse">
                <rect x="22" y="24" width="20" height="3" rx="1.5" fill="#00f0ff" />
              </g>
            ) : isAlarm ? (
              // Alert X eyes
              <g stroke="#f43f5e" strokeWidth="2" strokeLinecap="round">
                <line x1="24" y1="23" x2="28" y2="27" />
                <line x1="28" y1="23" x2="24" y2="27" />
                <line x1="36" y1="23" x2="40" y2="27" />
                <line x1="40" y1="23" x2="36" y2="27" />
              </g>
            ) : isHappy ? (
              // Happy caret eyes ^^
              <g stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none">
                <path d="M23 26L26 23L29 26" />
                <path d="M35 26L38 23L41 26" />
              </g>
            ) : (
              // Normal cyan glowing round eyes
              <g fill="#00f0ff">
                <circle cx="26" cy="26" r="3" />
                <circle cx="38" cy="26" r="3" />
                <circle cx="27" cy="25" r="1" fill="#ffffff" />
                <circle cx="39" cy="25" r="1" fill="#ffffff" />
              </g>
            )}

            {/* Body */}
            <rect x="20" y="39" width="24" height="15" rx="6" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
            {/* Chest Core Badge */}
            <circle
              cx="32"
              cy="46"
              r="3.5"
              fill={isLoading ? '#00f0ff' : '#10b981'}
              className="animate-ping"
              style={{ animationDuration: '2s' }}
            />
            <circle cx="32" cy="46" r="2.5" fill={isLoading ? '#00f0ff' : '#10b981'} />

            {/* Floating Thruster Arms */}
            <rect x="13" y="41" width="5" height="9" rx="2" fill="#334155" />
            <rect x="46" y="41" width="5" height="9" rx="2" fill="#334155" />
          </svg>
        </div>

        {/* Hover Micro Controls */}
        <div className="absolute -bottom-7 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-0.5 text-[9px] text-slate-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDocked(!isDocked);
            }}
            className="hover:text-cyan-400 flex items-center gap-1 font-mono"
            title={isDocked ? 'Release Roving' : 'Dock Unit-07'}
          >
            {isDocked ? <Maximize2 className="w-2.5 h-2.5" /> : <Minimize2 className="w-2.5 h-2.5" />}
            {isDocked ? 'Roam' : 'Dock'}
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggle) onToggle();
            }}
            className="hover:text-rose-400"
            title="Dismiss Companion"
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
}
