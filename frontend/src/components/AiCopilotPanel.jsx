import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, RefreshCw, Cpu, Settings, Copy, Check, X, AlertCircle } from 'lucide-react';
import { safeFetchJson } from '../config';
import { getSavedAiSettings } from './AiSettingsModal';

export default function AiCopilotPanel({ contextType = 'general', contextData = null, onClose, onOpenSettings }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [modelUsed, setModelUsed] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const quickPrompts = [
    { label: "⚙️ Analyze Vibration Metrics", prompt: "Evaluate the current vibration RMS, Peak, Crest Factor, and Kurtosis metrics against ISO 10816 velocity severity limits." },
    { label: "⚡ Evaluate Electrical Power Quality", prompt: "Calculate Active/Reactive/Apparent Power (P, Q, S), Power Factor cos(phi), THD%, and Symmetrical Components." },
    { label: "📡 Antenna VSWR & Friis Link Budget", prompt: "Analyze VSWR, Return Loss (S11), Reflection Coefficient, and Free Space Path Loss (FSPL) margin." },
    { label: "🎛️ Debug Node Graph Topology", prompt: "Review the active node graph topology, topological sort ordering, Kahn execution, and port data compatibility." },
    { label: "🐍 Generate Python Filter Code", prompt: "Write an optimal Butterworth lowpass filter script in Python using SciPy for this signal." }
  ];

  const handleRunAiInference = async (customPromptStr = null) => {
    const targetPrompt = customPromptStr || prompt;
    if (!targetPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    const settings = getSavedAiSettings();

    try {
      const payload = {
        prompt: targetPrompt,
        context_type: contextType,
        context_data: contextData,
        model: settings.model,
        custom_api_key: settings.customApiKey || null
      };

      const data = await safeFetchJson('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setResponse(data.analysis);
      setModelUsed(data.model_used);
    } catch (err) {
      setError(err.message || 'AI Copilot inference failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyResponseToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
      <div className="win98-outset w-full max-w-3xl bg-[#C0C0C0] p-3 flex flex-col gap-3 max-h-[85vh] shadow-2xl">
        {/* Titlebar */}
        <div className="win98-titlebar flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">REI SignalLab AI Copilot — OpenRouter Scientific Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onOpenSettings} className="win98-btn p-0.5 text-xs font-bold text-[#000080]" title="AI Model & Key Settings">
              <Settings size={12} />
            </button>
            <button onClick={onClose} className="win98-btn p-0.5 text-xs font-bold text-[#FF0000]">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Header Bar */}
        <div className="win98-inset p-2 bg-[#000080] text-white flex items-center justify-between border border-[#000000]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">Active Engine: {getSavedAiSettings().model}</span>
          </div>
          <button onClick={onOpenSettings} className="win98-btn text-[10px] font-bold bg-[#FFFFCC] text-[#000080]">
            ⚙️ Change Model / Key
          </button>
        </div>

        {/* Quick Diagnostic Prompts Bar */}
        <div className="flex gap-1.5 overflow-x-auto py-1 border-b border-[#808080]">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => { setPrompt(qp.prompt); handleRunAiInference(qp.prompt); }}
              className="win98-btn text-[10px] px-2 py-1 font-bold whitespace-nowrap bg-[#F0F0F0] hover:bg-[#FFFFCC]"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Chat / Response Display Container */}
        <div className="win98-inset bg-[#FFFFFF] p-3 overflow-y-auto max-h-[45vh] flex flex-col gap-3 min-h-[200px]">
          {loading && (
            <div className="flex items-center justify-center py-10 flex-col gap-2 font-mono text-xs text-[#000080]">
              <RefreshCw size={24} className="animate-spin text-[#0000FF]" />
              <span className="font-bold">Running OpenRouter Free Model Reasoning...</span>
            </div>
          )}

          {error && (
            <div className="win98-inset p-3 bg-[#FFDDDD] border border-[#FF0000] text-[#CC0000] text-xs font-mono flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">AI Processing Error:</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          {response && !loading && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-[#808080] pb-1">
                <span className="font-bold text-xs text-[#000080] flex items-center gap-1">
                  <Bot size={14} /> AI Diagnostic Report [{modelUsed}]:
                </span>
                <button onClick={copyResponseToClipboard} className="win98-btn text-[10px] font-bold flex items-center gap-1">
                  {copied ? <Check size={10} className="text-[#00AA00]" /> : <Copy size={10} />}
                  {copied ? 'Copied!' : 'Copy Report'}
                </button>
              </div>
              <div className="font-mono text-xs text-[#222222] whitespace-pre-wrap leading-relaxed bg-[#F9F9F9] p-2.5 border border-[#DDDDDD]">
                {response}
              </div>
            </div>
          )}

          {!response && !loading && !error && (
            <div className="text-center py-10 text-xs font-mono text-[#808080]">
              Select a 1-Click Quick Prompt above or type a custom DSP question below to start AI reasoning.
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="win98-outset p-2 bg-[#E0E0E0] flex gap-2">
          <input
            type="text"
            placeholder="Ask AI Copilot (e.g. How to reduce 50Hz mains power line interference in vibration FFT?)"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRunAiInference(); }}
            className="flex-1 text-xs font-mono p-1.5 border border-[#808080] bg-white"
          />
          <button
            onClick={() => handleRunAiInference()}
            disabled={loading || !prompt.trim()}
            className="win98-btn text-xs font-bold bg-[#000080] text-white px-4 flex items-center gap-1"
          >
            <Send size={12} /> Run AI
          </button>
        </div>
      </div>
    </div>
  );
}
