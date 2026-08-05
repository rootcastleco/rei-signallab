import React from 'react';
import { Gauge, Zap, Activity, Radio, Percent, ShieldAlert } from 'lucide-react';

export default function SignalMetrics({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Peak Frequency */}
      <div className="glass-panel p-3 flex flex-col gap-1 border-l-4 border-l-purple-500">
        <span className="text-[10px] text-gray-400 font-mono tracking-wider flex items-center gap-1">
          <Radio className="w-3 h-3 text-purple-400" /> FUNDAMENTAL
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white telemetry-val">{metrics.fundamental_freq || 0}</span>
          <span className="text-xs text-purple-400 font-mono">Hz</span>
        </div>
      </div>

      {/* 2. RMS Voltage */}
      <div className="glass-panel p-3 flex flex-col gap-1 border-l-4 border-l-cyan-500">
        <span className="text-[10px] text-gray-400 font-mono tracking-wider flex items-center gap-1">
          <Zap className="w-3 h-3 text-cyan-400" /> RMS VOLTAGE
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white telemetry-val">{metrics.rms || 0}</span>
          <span className="text-xs text-cyan-400 font-mono">V</span>
        </div>
      </div>

      {/* 3. Peak-to-Peak */}
      <div className="glass-panel p-3 flex flex-col gap-1 border-l-4 border-l-emerald-500">
        <span className="text-[10px] text-gray-400 font-mono tracking-wider flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-400" /> PEAK-TO-PEAK
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white telemetry-val">{metrics.peak_to_peak || 0}</span>
          <span className="text-xs text-emerald-400 font-mono">Vpp</span>
        </div>
      </div>

      {/* 4. DC Offset */}
      <div className="glass-panel p-3 flex flex-col gap-1 border-l-4 border-l-sky-500">
        <span className="text-[10px] text-gray-400 font-mono tracking-wider flex items-center gap-1">
          <Gauge className="w-3 h-3 text-sky-400" /> DC MEAN
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white telemetry-val">{metrics.dc_mean || 0}</span>
          <span className="text-xs text-sky-400 font-mono">V</span>
        </div>
      </div>

      {/* 5. THD */}
      <div className="glass-panel p-3 flex flex-col gap-1 border-l-4 border-l-amber-500">
        <span className="text-[10px] text-gray-400 font-mono tracking-wider flex items-center gap-1">
          <Percent className="w-3 h-3 text-amber-400" /> THD DISTORTION
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white telemetry-val">{metrics.thd_percent || 0}</span>
          <span className="text-xs text-amber-400 font-mono">%</span>
        </div>
      </div>

      {/* 6. SNR */}
      <div className="glass-panel p-3 flex flex-col gap-1 border-l-4 border-l-rose-500">
        <span className="text-[10px] text-gray-400 font-mono tracking-wider flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-rose-400" /> SNR RATIO
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white telemetry-val">{metrics.snr_db || 0}</span>
          <span className="text-xs text-rose-400 font-mono">dB</span>
        </div>
      </div>
    </div>
  );
}
