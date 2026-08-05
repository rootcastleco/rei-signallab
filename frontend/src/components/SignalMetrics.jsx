import React from 'react';

export default function SignalMetrics({ metrics }) {
  if (!metrics) return null;

  const cards = [
    { label: 'Peak Freq',   value: metrics.fundamental_freq || 0, unit: 'Hz',   color: 'blue' },
    { label: 'RMS',         value: metrics.rms || 0,               unit: 'V',    color: 'cyan' },
    { label: 'Pk-Pk',       value: metrics.peak_to_peak || 0,      unit: 'Vpp',  color: 'green' },
    { label: 'THD',         value: metrics.thd_percent || 0,       unit: '%',    color: 'amber' },
    { label: 'SNR',         value: metrics.snr_db || 0,            unit: 'dB',   color: 'red' },
    { label: 'SINAD',       value: metrics.sinad_db || 0,          unit: 'dB',   color: 'indigo' },
    { label: 'SFDR',        value: metrics.sfdr_db || 0,           unit: 'dB',   color: 'violet' },
    { label: 'ENOB',        value: metrics.enob_bits || 0,         unit: 'bits', color: 'pink' },
  ];

  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {cards.map((c) => (
        <div key={c.label} className={`metric-card ${c.color}`}>
          <span className="metric-label">{c.label}</span>
          <div>
            <span className="metric-value">{c.value}</span>
            <span className="metric-unit">{c.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
