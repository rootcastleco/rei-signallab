import React, { useState, useEffect } from 'react';
import { Cpu, Key, Save, RefreshCw, ShieldCheck, X, Sparkles, Check, Eye, EyeOff } from 'lucide-react';

export const DEFAULT_AI_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";

export const getSavedAiSettings = () => {
  try {
    const raw = localStorage.getItem('signallab_ai_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        model: parsed.model || DEFAULT_AI_MODEL,
        customApiKey: parsed.customApiKey || ''
      };
    }
  } catch (e) {
    console.warn('Failed to parse AI settings:', e);
  }
  return { model: DEFAULT_AI_MODEL, customApiKey: '' };
};

export const saveAiSettings = (settings) => {
  try {
    localStorage.setItem('signallab_ai_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save AI settings:', e);
  }
};

export default function AiSettingsModal({ onClose, onSave }) {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AI_MODEL);
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const models = [
    {
      id: "google/gemini-2.0-flash-lite-preview-02-05:free",
      name: "Google Gemini 2.0 Flash Lite (Free)",
      tag: "RECOMMENDED",
      desc: "Ultra-fast multimodal & analytical DSP reasoning model."
    },
    {
      id: "meta-llama/llama-3.3-70b-instruct:free",
      name: "Meta Llama 3.3 70B Instruct (Free)",
      tag: "DEEP REASONING",
      desc: "High precision deep analytical model for complex signal decomposition."
    },
    {
      id: "deepseek/deepseek-r1:free",
      name: "DeepSeek R1 Reasoning (Free)",
      tag: "MATH CHAIN",
      desc: "Chain-of-thought mathematical proof & harmonic breakdown."
    },
    {
      id: "qwen/qwen-2.5-coder-32b-instruct:free",
      name: "Qwen 2.5 Coder 32B (Free)",
      tag: "CODE EXPERT",
      desc: "Specialized code generator for Python, C++ & Lisp DSP algorithms."
    },
    {
      id: "mistralai/mistral-7b-instruct:free",
      name: "Mistral 7B Instruct (Free)",
      tag: "FAST LIGHT",
      desc: "Lightweight, instant model for quick telemetry summaries."
    }
  ];

  useEffect(() => {
    const s = getSavedAiSettings();
    setSelectedModel(s.model);
    setCustomApiKey(s.customApiKey);
  }, []);

  const handleSave = () => {
    const settings = {
      model: selectedModel,
      customApiKey: customApiKey.trim()
    };
    saveAiSettings(settings);
    setSavedSuccess(true);
    if (onSave) onSave(settings);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleResetKey = () => {
    setCustomApiKey('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
      <div className="win98-outset w-full max-w-lg bg-[#C0C0C0] p-3 flex flex-col gap-3 shadow-2xl">
        {/* Titlebar */}
        <div className="win98-titlebar flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">OpenRouter AI Copilot & Model Selector Settings</span>
          </div>
          <button onClick={onClose} className="win98-btn p-0.5 text-xs font-bold text-[#FF0000]">
            <X size={14} />
          </button>
        </div>

        {/* Header Information */}
        <div className="win98-inset p-3 bg-[#FFFFFF] flex items-center gap-3 border border-[#808080]">
          <div className="p-2 rounded-full bg-[#000080] text-white">
            <Cpu size={20} />
          </div>
          <div>
            <div className="font-bold text-xs text-[#000080]">OpenRouter Free Model Architecture</div>
            <div className="text-[10px] text-[#555555] font-mono">
              Select your preferred free OpenRouter LLM engine or customize your API key.
            </div>
          </div>
        </div>

        {/* Model Selection Dropdown */}
        <div className="win98-outset p-3 bg-[#E0E0E0] flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold flex items-center gap-1">
              <Sparkles size={12} className="text-[#000080]" /> Select Active AI Model:
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full text-xs font-mono p-1.5 border border-[#808080] bg-white font-bold text-[#000080]"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.tag}]
                </option>
              ))}
            </select>
          </div>

          {/* Selected Model Description */}
          {models.find(m => m.id === selectedModel) && (
            <div className="win98-inset p-2 bg-[#FFFFEE] border border-[#808080] text-[11px] font-mono text-[#333333]">
              <span className="font-bold text-[#000080]">Description: </span>
              {models.find(m => m.id === selectedModel)?.desc}
            </div>
          )}
        </div>

        {/* Custom OpenRouter API Key Input */}
        <div className="win98-outset p-3 bg-[#E0E0E0] flex flex-col gap-2 border border-[#808080]">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold flex items-center gap-1">
              <Key size={12} className="text-[#000080]" /> OpenRouter API Key:
            </label>
            <span className="text-[10px] font-mono text-[#00AA00] font-bold">
              {customApiKey ? 'CUSTOM KEY ACTIVE' : '✓ DEFAULT SYSTEM KEY ACTIVE'}
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="System default embedded key active (Or enter custom sk-or-v1-...)"
              value={customApiKey}
              onChange={e => setCustomApiKey(e.target.value)}
              className="w-full text-xs font-mono p-1.5 pr-8 border border-[#808080] bg-white"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 text-[#808080] hover:text-[#000000]"
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {customApiKey && (
            <div className="flex justify-end">
              <button onClick={handleResetKey} className="win98-btn text-[10px] font-bold text-[#FF0000] flex items-center gap-1">
                <RefreshCw size={10} /> Reset to System Default Key
              </button>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex justify-between items-center border-t border-[#808080] pt-2">
          {savedSuccess ? (
            <span className="text-xs text-[#008800] font-bold flex items-center gap-1 font-mono">
              <Check size={14} /> Settings Saved Successfully!
            </span>
          ) : <span />}

          <div className="flex gap-2">
            <button onClick={onClose} className="win98-btn text-xs px-3 font-bold">
              Cancel
            </button>
            <button onClick={handleSave} className="win98-btn text-xs px-4 font-bold bg-[#000080] text-white flex items-center gap-1">
              <Save size={12} /> Save AI Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
