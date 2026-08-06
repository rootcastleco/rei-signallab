import React from 'react';
import { Info, Github, ExternalLink, Cpu, ShieldCheck, Heart, Code2, Globe, Layers, BookOpen, X } from 'lucide-react';

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
      <div className="win98-outset w-full max-w-2xl bg-[#C0C0C0] p-3 flex flex-col gap-3 max-h-[90vh] shadow-2xl">
        {/* Titlebar */}
        <div className="win98-titlebar flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">About REI SignalLab 2.1 — System Architecture & Credits</span>
          </div>
          <button onClick={onClose} className="win98-btn p-0.5 text-xs font-bold text-[#FF0000]">
            <X size={14} />
          </button>
        </div>

        {/* Hero Header Banner */}
        <div className="win98-inset p-3.5 bg-[#000080] text-white flex flex-col gap-1 border border-[#000000]">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-black tracking-wider text-[#FFFF00] flex items-center gap-2">
                <Cpu size={20} /> REI SignalLab v2.1
              </div>
              <div className="text-xs text-[#E0E0E0] font-mono mt-0.5">
                Instrument-Grade Signal Processing, Canvas Node Engine & Scientific Workbench Suite
              </div>
            </div>
            <span className="bg-[#FFFF00] text-[#000000] px-2 py-0.5 text-[10px] font-bold font-mono">
              KAHN GRAPH ENGINE 2.1
            </span>
          </div>
        </div>

        {/* Author Branding & External Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Batuhan Ayribas Branding Card */}
          <div className="win98-outset p-3 bg-[#F8F8F8] flex flex-col gap-2 border border-[#808080]">
            <div className="font-bold text-xs text-[#000080] flex items-center gap-1.5 border-b border-[#808080] pb-1">
              <UserIcon /> Lead Architect & Engineer
            </div>
            <div className="text-xs">
              Designed and engineered by <span className="font-bold text-[#000000]">Batuhan Ayribas</span>.
            </div>
            <a
              href="https://batuhanayribas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="win98-btn text-xs font-bold bg-[#FFFFFF] text-[#000080] py-1 flex items-center justify-center gap-1 hover:bg-[#FFFFCC]"
            >
              <Globe size={12} className="text-[#0000FF]" /> Visit batuhanayribas.com <ExternalLink size={10} />
            </a>
          </div>

          {/* RootCastle Branding Card */}
          <div className="win98-outset p-3 bg-[#F8F8F8] flex flex-col gap-2 border border-[#808080]">
            <div className="font-bold text-xs text-[#000080] flex items-center gap-1.5 border-b border-[#808080] pb-1">
              <ShieldCheck size={14} /> Organization & Platform
            </div>
            <div className="text-xs">
              Maintained under the <span className="font-bold text-[#000000]">RootCastle</span> scientific software initiative.
            </div>
            <a
              href="https://rootcastle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="win98-btn text-xs font-bold bg-[#FFFFFF] text-[#000080] py-1 flex items-center justify-center gap-1 hover:bg-[#FFFFCC]"
            >
              <Globe size={12} className="text-[#0000FF]" /> Visit rootcastle.com <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Open Source GitHub Repository Banner */}
        <div className="win98-outset p-3 bg-[#E8E8E8] flex flex-col gap-2 border border-[#808080]">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Github size={18} className="text-[#000000]" />
              <div>
                <div className="font-bold text-xs text-[#000080]">Open Source GitHub Repository</div>
                <div className="text-[10px] text-[#555555] font-mono">rootcastleco/rei-signallab</div>
              </div>
            </div>
            <a
              href="https://github.com/rootcastleco/rei-signallab"
              target="_blank"
              rel="noopener noreferrer"
              className="win98-btn text-xs font-bold bg-[#000080] text-white px-3 py-1 flex items-center gap-1.5 hover:bg-[#0000AA]"
            >
              <Github size={14} /> View on GitHub <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Key Specifications Grid */}
        <div className="win98-inset p-3 bg-[#FFFFFF] overflow-y-auto max-h-44 flex flex-col gap-2 border border-[#808080]">
          <div className="font-bold text-xs text-[#000080] flex items-center gap-1">
            <Layers size={14} /> Technical Specifications & Architecture Overview:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-[#F0F0F0] p-2 border border-[#CCCCCC]">
              <span className="font-bold text-[#000080]">Graph Execution Engine:</span>
              <div>Topological DAG scheduler (Kahn 2.1 algorithm) enforcing typed port data contracts.</div>
            </div>
            <div className="bg-[#F0F0F0] p-2 border border-[#CCCCCC]">
              <span className="font-bold text-[#000080]">Canonical Node Catalog:</span>
              <div>45+ typed nodes across 16 domain categories (Vibration, Power, RF, GPS SDR, SRW, DSP Lab).</div>
            </div>
            <div className="bg-[#F0F0F0] p-2 border border-[#CCCCCC]">
              <span className="font-bold text-[#000080]">Backend Runtime:</span>
              <div>FastAPI Python 3.11 containerized microservice deployed on Google Cloud Run.</div>
            </div>
            <div className="bg-[#F0F0F0] p-2 border border-[#CCCCCC]">
              <span className="font-bold text-[#000080]">Cloud Storage & Auth:</span>
              <div>Firebase Auth SSO & Cloud Firestore real-time project synchronization.</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-[#808080] pt-2 text-[11px] font-mono text-[#555555]">
          <span>© 1998-2026 Batuhan Ayribas / RootCastle. All rights reserved.</span>
          <button onClick={onClose} className="win98-btn text-xs px-4 py-1 font-bold">
            Close About
          </button>
        </div>
      </div>
    </div>
  );
}

function UserIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-[#000080]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
