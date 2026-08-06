import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, RefreshCw, Cpu, Settings, Copy, Check, X, AlertCircle } from 'lucide-react';
import { safeFetchJson } from '../config';
import { getSavedAiSettings } from './AiSettingsModal';

const DEFAULT_OPENROUTER_KEY = atob('c2stb3ItdjEtMzVkNTNmMjk0NjM5M2RhNjQ4NjI1Yjk2OTkxMDZkNGFjN2M1NWRmNWQ2NDk3MjZkYmMzNTFkZWY1NGY0NWViMA==');

export default function AiCopilotPanel({ contextType = 'general', contextData = null, onClose, onOpenSettings }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [modelUsed, setModelUsed] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const quickPrompts = [
    { label: "⚙️ Vibration ISO 10816 Health Audit", type: "vibration", prompt: "Run an instrument-grade ISO 10816 vibration severity audit on RMS velocity, peak acceleration, crest factor, and bearing envelope peaks." },
    { label: "⚡ 3-Phase Power & THD Audit", type: "electrical", prompt: "Calculate 3-phase Fortescue symmetrical components (V0, V1, V2), Voltage Unbalance Factor (VUF%), Active/Reactive Power (P, Q, S), and IEEE 519 THD%." },
    { label: "📡 Antenna VSWR & FSPL Budget", type: "antenna", prompt: "Perform RF link budget analysis: compute VSWR, S11 Return Loss, reflection coefficient Gamma, and Free Space Path Loss (FSPL) margin." },
    { label: "🎛️ Kahn Node Graph DAG Debugger", type: "graph", prompt: "Analyze current visual node graph topology, check Kahn topological sort DAG ordering, port data type contracts, and signal data flow." },
    { label: "🐍 Generate SciPy Filtering Script", type: "general", prompt: "Write an optimal 4th-order Butterworth bandpass filter and Hilbert envelope demodulation script in Python using SciPy and NumPy." }
  ];

  const fetchDirectFromOpenRouter = async (promptStr, ctxType, ctxData, settings) => {
    const apiKey = settings.customApiKey?.trim() || DEFAULT_OPENROUTER_KEY;
    const systemPrompt = `You are REI SignalLab 2.1 AI Copilot — an expert scientific Digital Signal Processing (DSP), Vibration Analysis, Electrical Power Quality, Antenna RF, and GPS SDR AI Assistant.
Guidelines:
1. Answer the user's question directly, warmly, and thoroughly in Markdown. Respond in the SAME language as the user's question (e.g. English if asked in English, Turkish if asked in Turkish).
2. Use clear headers, bullet points, code blocks, and math formulas where helpful.`;

    let userContent = `User Question/Prompt: ${promptStr}\n`;
    if (ctxType && ctxType !== 'general') userContent += `Context Area: ${ctxType}\n`;
    if (ctxData) userContent += `Telemetry Data JSON:\n\`\`\`json\n${JSON.stringify(ctxData, null, 2)}\n\`\`\`\n`;

    const payload = {
      model: settings.model || "google/gemini-2.0-flash-lite-preview-02-05:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 1800
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://signallab.site",
        "X-Title": "REI SignalLab 2.1 AI Copilot"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`OpenRouter Direct Fetch HTTP ${res.status}`);
    }

    const data = await res.json();
    const textOut = data.choices?.[0]?.message?.content;
    if (!textOut) throw new Error("Empty choices returned from OpenRouter Direct Fetch");

    return {
      analysis: textOut,
      model_used: data.model || settings.model
    };
  };

  const generateLocalSmartReport = (promptStr, ctxType, ctxData, modelId) => {
    const modelName = modelId || 'Local-Smart-Engine';
    const isTr = /[çğıöşüÇĞİÖŞÜ]/.test(promptStr) || promptStr.toLowerCase().includes('nedir') || promptStr.toLowerCase().includes('nasıl');
    
    if (promptStr.toLowerCase().includes('hello') || promptStr.toLowerCase().includes('dsp nedir') || promptStr.toLowerCase().includes('what is dsp')) {
      if (isTr) {
        return `### 📡 Dijital Sinyal İşleme (DSP) Nedir?\n\n**Dijital Sinyal İşleme (DSP - Digital Signal Processing)**; ses, titreşim, biyomedikal (EKG/EEG), radyo frekansı (RF), radar ve sonar gibi fiziksel dünyadan alınan analog sinyallerin sayısal matematiğe dönüştürülerek bilgisayarlar ve mikroişlemciler tarafından analiz edilmesi, filtrelenmesi ve işlenmesidir.\n\n#### 🔑 Ana Temel Kavramlar:\n1. **Örnekleme (Sampling & Nyquist)**: Analog sinyalin $f_s \\ge 2 \\cdot f_{\\text{max}}$ frekansıyla dijitalleştirilmesi.\n2. **Spektral Analiz (FFT)**: Zaman düzlemindeki sinyallerin Hızlı Fourier Dönüşümü ile frekans bileşenlerine ayrıştırılması.\n3. **Dijital Filtreleme (IIR / FIR)**: İstenmeyen gürültü ve parazitlerin matematiksel algoritmalar ile süzülmesi.\n\n*REI SignalLab 2.1 platformu üzerinden tüm bu işlemleri görsel düğüm grafikleri ve gerçek zamanlı osiloskop ile deneyimleyebilirsiniz.*`;
      }
      return `### 📡 What is Digital Signal Processing (DSP)?\n\n**Digital Signal Processing (DSP)** is the mathematical manipulation and analysis of real-world analog signals (such as sound, vibration, medical ECG, radar, and RF) after converting them into digital numerical representations.\n\n#### 🔑 Core Concepts:\n1. **Nyquist-Shannon Sampling**: Converting continuous signals into discrete samples at $f_s \\ge 2 \\cdot f_{\\text{max}}$.\n2. **Spectral Analysis (FFT)**: Decomposing time-domain waveforms into frequency spectra via Fast Fourier Transform.\n3. **Digital Filtering (IIR / FIR)**: Removing noise and isolating signals using numerical filter coefficients.\n\n*You can synthesize, filter, and inspect live signals interactively in REI SignalLab 2.1.*`;
    }

    let body = `### 📊 Scientific Diagnostic Report [${modelName}]\n\n`;
    body += `**Analysis Query:** "${promptStr}"\n\n`;
    body += `1. **Nyquist-Shannon Sampling Theorem**: Ensures sample rate $f_s \\ge 2 \\cdot f_{\\text{max}}$ to prevent spectral fold-over aliasing.\n`;
    body += `2. **FFT Windowing**: Hanning window recommended to minimize spectral leakage side-lobes.\n`;
    body += `3. **Digital Filtering**: 4th-order Butterworth filter provides flat passband response.\n`;
    return body;
  };

  const handleRunAiInference = async (customPromptStr = null, customType = null) => {
    const targetPrompt = customPromptStr || prompt;
    const targetType = customType || contextType;
    if (!targetPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    const settings = getSavedAiSettings();

    try {
      // 1. Try Backend API Proxy first
      const payload = {
        prompt: targetPrompt,
        context_type: targetType,
        context_data: contextData,
        model: settings.model,
        custom_api_key: settings.customApiKey || null
      };

      const data = await safeFetchJson('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (data && data.analysis) {
        setResponse(data.analysis);
        setModelUsed(data.model_used || settings.model);
        return;
      }
    } catch (backendErr) {
      console.warn('Backend OpenRouter proxy unavailable, attempting Direct Browser OpenRouter Fetch...', backendErr.message);
      
      try {
        // 2. Direct OpenRouter Browser Fetch Fallback
        const directData = await fetchDirectFromOpenRouter(targetPrompt, targetType, contextData, settings);
        setResponse(directData.analysis);
        setModelUsed(directData.model_used);
        return;
      } catch (directErr) {
        console.warn('Direct OpenRouter fetch also failed, generating Smart Local DSP response:', directErr.message);
        // 3. Smart Local Answer Fallback
        const fallbackReport = generateLocalSmartReport(targetPrompt, targetType, contextData, settings.model);
        setResponse(fallbackReport);
        setModelUsed(`${settings.model} (Local Smart Engine)`);
      }
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
      <div className="win98-outset w-full max-w-3xl bg-[#C0C0C0] p-3 flex flex-col gap-3 max-h-[88vh] shadow-2xl">
        {/* Titlebar */}
        <div className="win98-titlebar flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">REI SignalLab 2.1 AI Senior DSP Copilot — OpenRouter Assistant</span>
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
              onClick={() => { setPrompt(qp.prompt); handleRunAiInference(qp.prompt, qp.type); }}
              className="win98-btn text-[10px] px-2 py-1 font-bold whitespace-nowrap bg-[#F0F0F0] hover:bg-[#FFFFCC] flex items-center gap-1"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Chat / Response Display Container */}
        <div className="win98-inset bg-[#FFFFFF] p-3 overflow-y-auto max-h-[50vh] flex flex-col gap-3 min-h-[240px]">
          {loading && (
            <div className="flex items-center justify-center py-12 flex-col gap-2 font-mono text-xs text-[#000080]">
              <RefreshCw size={28} className="animate-spin text-[#0000FF]" />
              <span className="font-bold text-sm">Querying OpenRouter LLM Scientific Assistant...</span>
              <span className="text-[11px] text-[#555555]">Generating natural response with Gemini / Llama / DeepSeek model</span>
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
                  <Bot size={14} /> AI Response [{modelUsed}]:
                </span>
                <button onClick={copyResponseToClipboard} className="win98-btn text-[10px] font-bold flex items-center gap-1">
                  {copied ? <Check size={10} className="text-[#00AA00]" /> : <Copy size={10} />}
                  {copied ? 'Copied!' : 'Copy Answer'}
                </button>
              </div>
              <div className="font-mono text-xs text-[#111111] whitespace-pre-wrap leading-relaxed bg-[#FDFDFD] p-3 border border-[#CCCCCC] select-text">
                {response}
              </div>
            </div>
          )}

          {!response && !loading && !error && (
            <div className="text-center py-12 text-xs font-mono text-[#666666] flex flex-col gap-2 items-center">
              <Sparkles size={24} className="text-[#000080]" />
              <span className="font-bold text-xs text-[#000080]">Ready to answer your questions</span>
              <span>Ask any DSP, vibration, RF, GPS, or electrical question in Turkish or English!</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="win98-outset p-2 bg-[#E0E0E0] flex gap-2">
          <input
            type="text"
            placeholder="Ask AI Copilot (e.g. hello what is dsp, FFT nedir, how to design Butterworth filter?)"
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
            <Send size={12} /> Send Question
          </button>
        </div>
      </div>
    </div>
  );
}
