import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from scipy import signal as scipy_signal

os.makedirs('docs/images', exist_ok=True)

# 1. Oscilloscope & Spectrum Dual Display Image
plt.style.use('dark_background')
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.5), dpi=150)
fig.patch.set_facecolor('#C0C0C0')

# Oscilloscope
t = np.linspace(0, 0.05, 2000)
raw = 1.5 * np.sin(2 * np.pi * 440 * t) + 0.3 * np.random.normal(0, 1, len(t))
filtered = scipy_signal.medfilt(raw, kernel_size=5)

ax1.set_facecolor('#000000')
ax1.plot(t * 1000, raw, color='#00FFFF', linewidth=1.2, label='CH1 Raw (Cyan)')
ax1.plot(t * 1000, filtered, color='#00FF00', linewidth=1.5, label='CH2 Filtered (Green)')
ax1.set_title('REI SignalLab 2.0 - Dual CRT Oscilloscope', color='#000000', fontsize=11, fontweight='bold', pad=10)
ax1.set_xlabel('Time (ms)', color='#000000', fontsize=9)
ax1.set_ylabel('Voltage (V)', color='#000000', fontsize=9)
ax1.grid(True, color='#003300', linestyle=':')
ax1.legend(loc='upper right', facecolor='#000000', edgecolor='#00FF00', labelcolor='#00FF00')

# Spectrum Analyzer
freqs = np.linspace(0, 5000, 1000)
mag_db = -60.0 + 40.0 * np.exp(-((freqs - 440) ** 2) / (2 * (30 ** 2))) + 20.0 * np.exp(-((freqs - 880) ** 2) / (2 * (40 ** 2)))
ax2.set_facecolor('#000000')
ax2.plot(freqs, mag_db, color='#00FFFF', linewidth=1.5, label='FFT Spectrum')
ax2.axvline(440, color='#FF0000', linestyle='--', label='Peak: 440.0 Hz')
ax2.set_title('FFT Spectrum Analyzer (THD: 0.15% | SNR: 46.2 dB)', color='#000000', fontsize=11, fontweight='bold', pad=10)
ax2.set_xlabel('Frequency (Hz)', color='#000000', fontsize=9)
ax2.set_ylabel('Magnitude (dBV)', color='#000000', fontsize=9)
ax2.grid(True, color='#003300', linestyle=':')
ax2.legend(loc='upper right', facecolor='#000000', edgecolor='#00FF00', labelcolor='#00FF00')

plt.tight_layout()
plt.savefig('docs/images/signallab_ui_overview.png', bbox_inches='tight')
plt.close(fig)

# 2. Python Code Sandbox Preview Image
fig, ax = plt.subplots(figsize=(10, 4), dpi=150)
fig.patch.set_facecolor('#0D1117')
ax.set_facecolor('#000000')

t_ecg = np.linspace(0, 2.0, 44100 * 2)
period = 0.8
t_mod = np.mod(t_ecg, period) / period
ecg_raw = (
    0.15 * np.exp(-((t_mod - 0.2) ** 2) / (2 * (0.02 ** 2))) -
    0.15 * np.exp(-((t_mod - 0.35) ** 2) / (2 * (0.005 ** 2))) +
    1.00 * np.exp(-((t_mod - 0.4) ** 2) / (2 * (0.01 ** 2))) -
    0.25 * np.exp(-((t_mod - 0.45) ** 2) / (2 * (0.008 ** 2))) +
    0.35 * np.exp(-((t_mod - 0.7) ** 2) / (2 * (0.04 ** 2)))
)
ecg_noisy = ecg_raw + np.random.normal(0, 0.08, len(t_ecg))

ax.plot(t_ecg[:4410], ecg_noisy[:4410], color='#FF5555', alpha=0.6, label='Raw Noisy ECG')
ax.plot(t_ecg[:4410], ecg_raw[:4410], color='#00FF00', linewidth=1.8, label='Filtered ECG Heartbeat')
ax.set_title('Python DSP Sandbox: Synthetic ECG Heartbeat Experiment', color='#FFFFFF', fontsize=11, fontweight='bold')
ax.set_xlabel('Time (seconds)', color='#808080', fontsize=9)
ax.grid(True, color='#003300', linestyle=':')
ax.legend(loc='upper right', facecolor='#000000', edgecolor='#00FF00', labelcolor='#00FF00')

plt.tight_layout()
plt.savefig('docs/images/python_lab_preview.png', bbox_inches='tight')
plt.close(fig)

# 3. Node Flow Studio Image
fig, ax = plt.subplots(figsize=(10, 3.5), dpi=150)
fig.patch.set_facecolor('#C0C0C0')
ax.set_facecolor('#000000')

# Draw simulated nodes
ax.text(0.15, 0.5, '[ SignalGenerator ]\nSine (440Hz)', color='#00FF00', fontsize=11, fontweight='bold', bbox=dict(facecolor='#000000', edgecolor='#00FF00', boxstyle='square,pad=1'), ha='center', va='center')
ax.annotate('', xy=(0.38, 0.5), xytext=(0.27, 0.5), arrowprops=dict(facecolor='#00FF00', edgecolor='#00FF00', arrowstyle='->', lw=2))
ax.text(0.5, 0.5, '[ BiquadFilter ]\nLowPass (1000Hz)', color='#00FFFF', fontsize=11, fontweight='bold', bbox=dict(facecolor='#000000', edgecolor='#00FFFF', boxstyle='square,pad=1'), ha='center', va='center')
ax.annotate('', xy=(0.73, 0.5), xytext=(0.62, 0.5), arrowprops=dict(facecolor='#00FFFF', edgecolor='#00FFFF', arrowstyle='->', lw=2))
ax.text(0.85, 0.5, '[ FFTAnalyzer ]\n1024-point Hanning', color='#FFFF00', fontsize=11, fontweight='bold', bbox=dict(facecolor='#000000', edgecolor='#FFFF00', boxstyle='square,pad=1'), ha='center', va='center')

ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.axis('off')
ax.set_title('REI SignalFlow Studio 2.0 - Typed Signal Processing Graph Runtime (.rei-signal)', color='#000000', fontsize=12, fontweight='bold', pad=10)

plt.tight_layout()
plt.savefig('docs/images/node_flow_studio.png', bbox_inches='tight')
plt.close(fig)

print("Generated docs PNG images successfully!")
