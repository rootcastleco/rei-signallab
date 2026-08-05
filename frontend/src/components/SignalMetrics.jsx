import React from 'react';
import { Gauge, Zap, Activity, Radio, Percent, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export default function SignalMetrics({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {/* 1. Fundamental Freq */}
      <div className="studio-card p-2 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
          <Radio className="w-3 h-3 text-purple-400" /> PEAK FREQ
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-[#F0F6FC] telemetry-font">{metrics.fundamental_freq || 0}</span>
          <span className="text-[10px] text-[#8B949E] font-mono">Hz</span>
        </div>
      </div>

      {/* 2. RMS */}
      <div className="studio-card p-2 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
          <Zap className="w-3 h-3 text-sky-400" /> RMS VOLTS
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-[#F0F6FC] telemetry-font">{metrics.rms || 0}</span>
          <span className="text-[10px] text-[#8B949E] font-mono">V</span>
        </div>
      </div>

      {/* 3. P2P */}
      <div className="studio-card p-2 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-400" /> PEAK-TO-PEAK
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-[#F0F6FC] telemetry-font">{metrics.peak_to_peak || 0}</span>
          <span className="text-[10px] text-[#8B949E] font-mono">Vpp</span>
        </div>
      </div>

      {/* 4. THD */}
      <div className="studio-card p-2 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
          <Percent className="w-3 h-3 text-amber-400" /> THD
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-[#F0F6FC] telemetry-font">{metrics.thd_percent || 0}</span>
          <span className="text-[10px] text-[#8B949E] font-mono">%</span>
        </div>
      </div>

      {/* 5. SNR */}
      <div className="studio-card p-2 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-rose-400" /> SNR RATIO
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-[#F0F6FC] telemetry-font">{metrics.snr_db || 0}</span>
          <span className="text-[10px] text-[#8B949E] font-mono">dB</span>
        </div>
      </div>

      {/* 6. SINAD */}
      <div className="studio-card p-2 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
          <Gauge className="w-3 h-3 text-indigo-400" /> SINAD
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-[#F0F6FC] telemetry-font">{metrics.sinad_db || 0}</span>
          <span className="text-[10px] text-[#8B949E] font-mono">dB</span>
        </div>
      </div>

      {/* 7. SFDR */}
      <div className="studio-card p-2 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-sky-400" /> SFDR RANGE
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-[#F0F6FC] telemetry-font">{metrics.sfdr_db || 0}</span>
          <span className="text-[10px] text-[#8B949E] font-mono">dB</span>
        </div>
      </div>

      {/* 8. ENOB */}
      <div className="studio-card p-2 flex flex-col gap-0.5">
        <span className="text-[10px] text-[#8B949E] font-mono flex items-center gap-1">
          <Cpu className="w-3 h-3 text-pink-400" /> ENOB
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-[#F0F6FC] telemetry-font">{metrics.enob_bits || 0}</span>
          <span className="text-[10px] text-[#8B949E] font-mono">bits</span>
        </div>
      </div>
    </div>
  );
}
