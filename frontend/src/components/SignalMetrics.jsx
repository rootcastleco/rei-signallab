import React from 'react';

export default function SignalMetrics({ metrics }) {
  if (!metrics) return null;

  const formatVal = (val, fallback = 'N/A') => {
    if (val === null || val === undefined) return fallback;
    return val;
  };

  const cards = [
    { label: 'PEAK_FREQ', value: formatVal(metrics.fundamental_freq), unit: 'Hz', color: '#00FF00' },
    { label: 'RMS_VOLTS', value: formatVal(metrics.rms), unit: 'V', color: '#00FFFF' },
    { label: 'PEAK_P2P', value: formatVal(metrics.peak_to_peak), unit: 'Vpp', color: '#FFFF00' },
    { label: 'THD_PCT', value: formatVal(metrics.thd_percent), unit: '%', color: '#FF5555' },
    { label: 'SNR_DB', value: formatVal(metrics.snr_db), unit: 'dB', color: '#00FF00' },
    { label: 'SINAD_DB', value: formatVal(metrics.sinad_db), unit: 'dB', color: '#00FFFF' },
    { label: 'SFDR_DB', value: formatVal(metrics.sfdr_db), unit: 'dB', color: '#FFFF00' },
    { label: 'ENOB_BITS', value: formatVal(metrics.enob_bits), unit: 'bits', color: '#FF5555' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {cards.map((c) => (
        <div key={c.label} className="win98-hitcounter flex flex-col justify-between h-13">
          <div className="flex justify-between items-center text-[9px] text-[#808080] font-mono font-bold">
            <span>{c.label}</span>
            <span className={`w-1.5 h-1.5 ${c.value === 'N/A' ? 'bg-[#808080]' : 'bg-[#00FF00]'}`}></span>
          </div>
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-sm font-bold font-mono" style={{ color: c.value === 'N/A' ? '#808080' : c.color }}>
              {c.value}
            </span>
            {c.value !== 'N/A' && <span className="text-[9px] text-[#808080] font-mono">{c.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
