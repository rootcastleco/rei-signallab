import React, { useState } from 'react';
import { Download, Code, Check, Copy, X, Terminal, Cpu, Play } from 'lucide-react';

export default function MatlabAddonModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('install');

  const sampleMatlabCode = `% REI SignalLab 2.1 — MATLAB Client Usage Example
% Engineered by Batuhan Ayribas at RootCastle (https://rootcastle.com)

clc; clear; close all;

% 1. Connect to live REI SignalLab Engine
lab = REISignalLab('https://signallab.site');
lab.checkHealth();

% 2. Synthesize & Filter Signal
sig = lab.processSignal('sine', 440, 1.0, 44100, 0.1, 'lowpass', 1000);

% 3. Plot Oscilloscope & FFT Spectrum in MATLAB
figure('Name', 'REI SignalLab 2.1 MATLAB Visualizer');
subplot(2,1,1); plot(sig.time, sig.signal, 'b', 'LineWidth', 1.5);
grid on; xlabel('Time (s)'); ylabel('Amplitude (V)'); title('Waveform');

subplot(2,1,2); stem(sig.fft.frequencies(1:100), sig.fft.magnitude(1:100), 'r');
grid on; xlabel('Frequency (Hz)'); ylabel('Magnitude (dB)'); title('FFT Spectrum');

% 4. Query OpenRouter AI Senior DSP Copilot from MATLAB
report = lab.askAiCopilot('Evaluate 2X line frequency vibration unbalance in induction motors.', 'vibration');
disp(report);`;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(sampleMatlabCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
      <div className="win98-outset w-full max-w-2xl bg-[#C0C0C0] p-3 flex flex-col gap-3 shadow-2xl">
        {/* Titlebar */}
        <div className="win98-titlebar flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">MATLAB Add-On & Toolbox Integration Suite</span>
          </div>
          <button onClick={onClose} className="win98-btn p-0.5 text-xs font-bold text-[#FF0000]">
            <X size={14} />
          </button>
        </div>

        {/* Header */}
        <div className="win98-inset p-3 bg-[#FFFFFF] border border-[#808080] flex items-center gap-3">
          <div className="p-2 rounded bg-[#CC3300] text-white">
            <Code size={24} />
          </div>
          <div>
            <div className="font-bold text-xs text-[#CC3300]">REI SignalLab 2.1 MATLAB Add-On Toolbox</div>
            <div className="text-[10px] text-[#555555] font-mono">
              Execute signal processing, vibration balancing, 3,570+ bearing queries & AI Copilot directly inside MATLAB!
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#808080]">
          <button
            onClick={() => setActiveTab('install')}
            className={`win98-btn text-xs font-bold px-3 py-1 ${activeTab === 'install' ? 'bg-[#FFFFFF] border-b-0' : 'bg-[#E0E0E0]'}`}
          >
            📥 1-Click Installers
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`win98-btn text-xs font-bold px-3 py-1 ${activeTab === 'code' ? 'bg-[#FFFFFF] border-b-0' : 'bg-[#E0E0E0]'}`}
          >
            💻 MATLAB Code Generator
          </button>
        </div>

        {/* Content Panel */}
        {activeTab === 'install' ? (
          <div className="win98-outset p-3 bg-[#E0E0E0] flex flex-col gap-3">
            <div className="font-bold text-xs text-[#000080]">Download MATLAB Add-On Files:</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <a
                href="/api/matlab/client"
                download="REISignalLab.m"
                className="win98-btn p-3 bg-[#FFFFFF] hover:bg-[#FFFFCC] flex flex-col items-start gap-1 border border-[#808080] text-left"
              >
                <span className="font-bold text-xs text-[#000080] flex items-center gap-1">
                  <Download size={14} /> REISignalLab.m
                </span>
                <span className="text-[10px] text-[#666666] font-mono">
                  Object-oriented MATLAB class client for R2018b–R2026a+.
                </span>
              </a>

              <a
                href="/api/matlab/installer"
                download="install_rei_signallab.m"
                className="win98-btn p-3 bg-[#FFFFFF] hover:bg-[#FFFFCC] flex flex-col items-start gap-1 border border-[#808080] text-left"
              >
                <span className="font-bold text-xs text-[#00AA00] flex items-center gap-1">
                  <Play size={14} /> install_rei_signallab.m
                </span>
                <span className="text-[10px] text-[#666666] font-mono">
                  1-Click installer script for adding path & self-testing.
                </span>
              </a>
            </div>

            <div className="win98-inset p-2 bg-[#FFFFEE] border border-[#808080] text-[11px] font-mono text-[#333333]">
              <span className="font-bold text-[#000080]">Installation Instructions:</span>
              <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                <li>Download both files into your MATLAB working folder.</li>
                <li>Open MATLAB and type: <code className="bg-[#E0E0E0] px-1 font-bold">install_rei_signallab</code></li>
                <li>Start analyzing signals directly using <code className="bg-[#E0E0E0] px-1 font-bold">lab = REISignalLab()</code>!</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="win98-outset p-3 bg-[#E0E0E0] flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-xs text-[#000080]">Executable MATLAB Script Example:</span>
              <button onClick={copyCodeToClipboard} className="win98-btn text-[10px] font-bold flex items-center gap-1">
                {copied ? <Check size={10} className="text-[#00AA00]" /> : <Copy size={10} />}
                {copied ? 'Copied to Clipboard!' : 'Copy MATLAB Code'}
              </button>
            </div>

            <pre className="win98-inset bg-[#000000] text-[#00FF00] p-3 text-[11px] font-mono overflow-x-auto max-h-[300px] border border-[#808080]">
              {sampleMatlabCode}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t border-[#808080] pt-2">
          <button onClick={onClose} className="win98-btn text-xs px-4 font-bold bg-[#000080] text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
