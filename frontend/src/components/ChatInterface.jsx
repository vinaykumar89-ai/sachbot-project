import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Upload,
  Link as LinkIcon,
  Globe,
  Sparkles,
  Image as ImageIcon,
  Crop,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Flame,
  ArrowRight,
  Cpu,
  Layers,
  ScanLine
} from 'lucide-react';
import CircleToSearchModal from './CircleToSearchModal.jsx';

export default function ChatInterface({
  onSubmitClaim,
  isLoading,
  initialText = '',
  onTypingChange,
}) {
  const [inputText, setInputText] = useState(initialText);
  const [inputUrl, setInputUrl] = useState('');
  const [languagePref, setLanguagePref] = useState('auto');
  
  // Image states
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const fileInputRef = useRef(null);

  // Notify robot companion of typing
  useEffect(() => {
    if (onTypingChange) {
      onTypingChange(Boolean(inputText.trim()));
    }
  }, [inputText, onTypingChange]);

  // Sample viral claims & conversational queries for quick demonstration
  const sampleClaims = [
    {
      label: "Ask: Jacqueline Cannes 2026",
      text: "Is Jacqueline Fernandez really returning to Cannes Film Festival in 2026?",
      type: "ask"
    },
    {
      label: "Ask: UNESCO Anthem Award",
      text: "Did UNESCO officially declare Jana Gana Mana as the best national anthem in the world?",
      type: "ask"
    },
    {
      label: "Ask: RBI 2000 Note GPS Chip",
      text: "Does the Reserve Bank of India Rs 2000 note contain a Nano GPS tracking chip?",
      type: "ask"
    },
    {
      label: "Ask: NASA Diwali Satellite Photo",
      text: "Did NASA release a real satellite photograph of India glowing in colors on Diwali night?",
      type: "ask"
    },
    {
      label: "Satire News: The Onion",
      text: "Check if this gorilla article from The Onion is real or satire",
      url: "https://www.theonion.com/scientists-successfully-teach-gorilla-to-complain-about-1851458923",
      type: "satire"
    }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setCroppedBlob(null);
      setCroppedPreviewUrl(null);
      setIsCropModalOpen(true);
    }
  };

  const handleConfirmCrop = (blob, previewUrl) => {
    setCroppedBlob(blob);
    setCroppedPreviewUrl(previewUrl);
    setIsCropModalOpen(false);
  };

  const handleSkipCrop = () => {
    setCroppedBlob(null);
    setCroppedPreviewUrl(null);
    setIsCropModalOpen(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl(null);
    setCroppedBlob(null);
    setCroppedPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSample = (sample) => {
    setInputText(sample.text || '');
    setInputUrl(sample.url || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !inputUrl.trim() && !imageFile) return;

    onSubmitClaim({
      text: inputText.trim(),
      url: inputUrl.trim(),
      language_pref: languagePref,
      imageFile: imageFile,
      croppedBlob: croppedBlob
    });
  };

  const hasInput = Boolean(inputText.trim() || inputUrl.trim() || imageFile);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Sample Viral Claim Shortcuts */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-cyan-400 font-mono font-bold flex items-center gap-1.5 shrink-0 text-[11px]">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          TEST_VECTOR_PROMPTS:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {sampleClaims.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleLoadSample(sample)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-cyan-200 transition-all text-[11px] font-mono shadow-sm active:scale-95"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Multi-Input Container with Robotic HUD Styling */}
      <form
        onSubmit={handleSubmit}
        className="hud-card rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 focus-within:border-cyan-400/60 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all relative overflow-hidden"
      >
        {/* Top Telemetry Header */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-cyan-500/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-cyan-300 font-bold">RADAR::STANDBY</span>
            <span className="text-slate-600">/</span>
            <span>MULTIMODAL_INGESTION_BUS</span>
          </div>
          <span className="text-slate-500">STAGE::READY</span>
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask Sachbot anything, or paste a viral claim/image to verify (Press Enter to ask)..."
            rows={2}
            className="w-full bg-[#050811]/80 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 resize-none transition-colors font-sans"
          />
        </div>

        {/* URL Input Bar */}
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-cyan-400/70">
            <LinkIcon className="w-4 h-4" />
          </div>
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Or paste news article, YouTube Shorts, X/Twitter, or Instagram Reel URL..."
            className="w-full bg-[#050811]/80 border border-slate-800/90 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors font-mono"
          />
          {inputUrl && (
            <button
              type="button"
              onClick={() => setInputUrl('')}
              className="absolute right-3 p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Image Attachment & Cropped Preview Chip */}
        {imageUrl && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl bg-[#050811]/90 border border-cyan-500/40">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-cyan-500/30 shrink-0">
              <img
                src={croppedPreviewUrl || imageUrl}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
              {croppedPreviewUrl && (
                <span className="absolute bottom-0 inset-x-0 bg-cyan-500 text-[8px] text-slate-950 font-bold uppercase text-center font-mono">
                  Cropped
                </span>
              )}
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
                  {imageFile?.name || 'Attached Image'}
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  {croppedPreviewUrl ? 'Target Region Cropped' : 'Full Image'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 break-words">
                {croppedPreviewUrl
                  ? 'Focused region selected for targeted OCR & reverse image lookup.'
                  : 'Full image will be OCR-scanned and checked for AI markers & EXIF.'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-colors min-h-[44px]"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{croppedPreviewUrl ? 'Re-crop Region' : 'Crop Focus Region'}</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-2.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Toolbar & Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-cyan-500/10">
          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#050811] hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-xs font-semibold text-slate-300 hover:text-cyan-200 transition-all shadow-sm min-h-[44px]"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Attach Image</span>
            </button>

            {/* Multilingual Selector */}
            <div className="flex-1 sm:flex-none flex items-center gap-1.5 bg-[#050811] px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 min-h-[44px]">
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={languagePref}
                onChange={(e) => setLanguagePref(e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-medium text-slate-200 cursor-pointer font-sans w-full"
              >
                <option value="auto" className="bg-slate-900 text-slate-200">
                  Auto-Detect (Hinglish/Regional)
                </option>
                <option value="en" className="bg-slate-900 text-slate-200">
                  English
                </option>
                <option value="hi" className="bg-slate-900 text-slate-200">
                  Hindi (हिंदी)
                </option>
                <option value="hinglish" className="bg-slate-900 text-slate-200">
                  Hinglish (Conversational)
                </option>
                <option value="ta" className="bg-slate-900 text-slate-200">
                  Tamil (தமிழ்)
                </option>
                <option value="te" className="bg-slate-900 text-slate-200">
                  Telugu (తెలుగు)
                </option>
                <option value="kn" className="bg-slate-900 text-slate-200">
                  Kannada (ಕನ್ನಡ)
                </option>
                <option value="mr" className="bg-slate-900 text-slate-200">
                  Marathi (मराठी)
                </option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!hasInput || isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all shadow-lg shadow-cyan-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none font-mono tracking-wider uppercase min-h-[44px]"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Scanning...' : 'Verify Fact'}</span>
          </button>
        </div>
      </form>

      {/* Circle to Search Cropper Modal */}
      <CircleToSearchModal
        isOpen={isCropModalOpen}
        imageFile={imageFile}
        imageUrl={imageUrl}
        onConfirmCrop={handleConfirmCrop}
        onSkipCrop={handleSkipCrop}
        onCancel={() => setIsCropModalOpen(false)}
      />
    </div>
  );
}
