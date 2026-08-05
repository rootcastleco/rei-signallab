import React from 'react';

export default function SignalMetrics({ metrics }) {
  if (!metrics) return null;

  const cards = [
    { label: 'PEAK_FREQ', value: metrics.fundamental_freq || 0, unit: 'Hz', color: '#00FF00' },
    { label: 'RMS_VOLTS', value: metrics.rms || 0, unit: 'V', color: '#00FFFF' },
    { label: 'PEAK_P2P', value: metrics.peak_to_peak || 0, unit: 'Vpp', color: '#FFFF00' },
    { label: 'THD_PCT', value: metrics.thd_percent || 0, unit: '%', color: '#FF5555' },
    { label: 'SNR_DB', value: metrics.snr_db || 0, unit: 'dB', color: '#00FF00' },
    { label: 'SINAD_DB', value: metrics.sinad_db || 0, unit: 'dB', color: '#00FFFF' },
    { label: 'SFDR_DB', value: metrics.sfdr_db || 0, unit: 'dB', color: '#FFFF00' },
    { label: 'ENOB_BITS', value: metrics.enob_bits || 0, unit: 'bits', color: '#FF5555' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {cards.map((c) => (
        <div key={c.label} className="win98-hitcounter flex flex-col justify-between h-13">
          <div className="flex justify-between items-center text-[9px] text-[#808080] font-mono font-bold">
            <span>{c.label}</span>
            <span className="w-1.5 h-1.5 bg-[#00FF00]"></span>
          </div>
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-sm font-bold font-mono" style={{ color: c.color }}>
              {c.value}
            </span>
            <span className="text-[9px] text-[#808080] font-mono">{c.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
