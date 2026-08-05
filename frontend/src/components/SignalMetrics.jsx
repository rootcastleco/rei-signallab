import React from 'react';

export default function SignalMetrics({ metrics }) {
  if (!metrics) return null;

  const cards = [
    { label: 'PEAK FREQ', value: metrics.fundamental_freq || 0, unit: 'Hz', color: 'blue' },
    { label: 'RMS VOLTS', value: metrics.rms || 0, unit: 'V', color: 'cyan' },
    { label: 'PEAK-TO-PEAK', value: metrics.peak_to_peak || 0, unit: 'Vpp', color: 'green' },
    { label: 'THD RATIO', value: metrics.thd_percent || 0, unit: '%', color: 'amber' },
    { label: 'SNR RATIO', value: metrics.snr_db || 0, unit: 'dB', color: 'red' },
    { label: 'SINAD', value: metrics.sinad_db || 0, unit: 'dB', color: 'indigo' },
    { label: 'SFDR RANGE', value: metrics.sfdr_db || 0, unit: 'dB', color: 'violet' },
    { label: 'ENOB', value: metrics.enob_bits || 0, unit: 'bits', color: 'pink' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
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
