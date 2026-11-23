import React, { useState, useEffect } from 'react';

const ROBOT_TAGS = [
  "Scanning... 📡",
  "Sach Check! 🛡️",
  "Truth Radar ✨",
  "Beep-Boop 🤖",
  "Forensics Active ⚡",
  "Grounded! 🎯",
  "Authentic 🔎",
  "No Lies Allowed 🚫",
  "Checking Citations 📚",
  "Sensors Primed 🔮"
];

export default function ClickRobotBurst({ enabled = true }) {
  const [bots, setBots] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e) => {
      // Ignore clicks inside form controls, buttons, links, or modals
      const target = e.target;
      if (!target) return;

      const isInteractive = target.closest(
        'button, input, textarea, select, a, [role="button"], [data-no-burst], .cursor-pointer, canvas'
      );
      if (isInteractive) return;

      // Ignore if user is selecting text
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;

      const newBot = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
        tag: ROBOT_TAGS[Math.floor(Math.random() * ROBOT_TAGS.length)],
        rotation: (Math.random() - 0.5) * 16, // subtle tilt
      };

      setBots((prev) => {
        // Cap max 8 simultaneous bots
        const updated = [...prev, newBot];
        if (updated.length > 8) {
          return updated.slice(updated.length - 8);
        }
        return updated;
      });

      // Auto-prune this bot after 1.1s
      setTimeout(() => {
        setBots((prev) => prev.filter((b) => b.id !== newBot.id));
      }, 1150);
    };

    window.addEventListener('pointerdown', handleClick);
    return () => window.removeEventListener('pointerdown', handleClick);
  }, [enabled]);

  if (!enabled || bots.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {bots.map((bot) => (
        <div
          key={bot.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-click-robot flex flex-col items-center"
          style={{
            left: `${bot.x}px`,
            top: `${bot.y}px`,
          }}
        >
          {/* Micro Fact-Check Speech Tag */}
          <div
            className="mb-1 px-2 py-0.5 rounded-full bg-slate-900/95 border border-cyan-400/60 text-[10px] font-mono font-bold text-cyan-300 shadow-lg shadow-cyan-950/80 whitespace-nowrap animate-bounce"
            style={{ animationDuration: '0.8s' }}
          >
            {bot.tag}
          </div>

          {/* Cute Mini-Bot SVG */}
          <div
            className="drop-shadow-[0_0_10px_rgba(0,240,255,0.7)]"
            style={{ transform: `rotate(${bot.rotation}deg)` }}
          >
            <svg
              width="42"
              height="42"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Antenna */}
              <line x1="24" y1="10" x2="24" y2="4" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="24" cy="4" r="2.5" fill="#00f0ff" className="animate-ping" />
              <circle cx="24" cy="4" r="2" fill="#ffffff" />

              {/* Head */}
              <rect x="12" y="10" width="24" height="18" rx="6" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.8" />
              
              {/* Visor */}
              <rect x="15" y="14" width="18" height="10" rx="3.5" fill="#030712" />
              
              {/* Joyful Cyan Visor Eyes ^^ */}
              <path d="M18 19L20 17L22 19" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M26 19L28 17L30 19" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" />

              {/* Little Chassis */}
              <rect x="15" y="29" width="18" height="12" rx="4" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
              <circle cx="24" cy="35" r="2" fill="#10b981" />

              {/* Waving Right Arm */}
              <path
                d="M33 32L38 27L41 29"
                stroke="#00f0ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 32L10 34"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Thruster Glow */}
              <ellipse cx="24" cy="42" rx="6" ry="2" fill="#00f0ff" opacity="0.8" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
