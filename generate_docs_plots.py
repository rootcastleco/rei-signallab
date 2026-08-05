"""
Generate real signal plot screenshots from the REI SignalLab API
for use in README documentation.
"""
import requests
import os

BASE = "http://127.0.0.1:8000"
OUT_DIR = os.path.join(os.path.dirname(__file__), "docs", "images")
os.makedirs(OUT_DIR, exist_ok=True)

# 1. Oscilloscope plot - 1kHz sine
print("Generating oscilloscope plot...")
r = requests.get(f"{BASE}/api/render/plot", params={
    "waveform": "sine",
    "frequency": 1000,
    "amplitude": 1.5,
    "plot_type": "oscilloscope"
})
with open(os.path.join(OUT_DIR, "plot_oscilloscope.png"), "wb") as f:
    f.write(r.content)
print(f"  -> plot_oscilloscope.png ({len(r.content)} bytes)")

# 2. Spectrum plot - 1kHz sine
print("Generating spectrum plot...")
r = requests.get(f"{BASE}/api/render/plot", params={
    "waveform": "sine",
    "frequency": 1000,
    "amplitude": 1.5,
    "plot_type": "spectrum"
})
with open(os.path.join(OUT_DIR, "plot_spectrum.png"), "wb") as f:
    f.write(r.content)
print(f"  -> plot_spectrum.png ({len(r.content)} bytes)")

# 3. AM modulated oscilloscope via POST
print("Generating AM modulated plot...")
payload = {
    "generator": {
        "waveform": "sine",
        "frequency": 1000,
        "amplitude": 1.5,
        "sample_rate": 44100,
        "duration": 0.05,
        "modulation_type": "am",
        "mod_frequency": 80,
        "mod_index": 0.7
    },
    "math": {"envelope_extraction": True},
    "filter": {"enabled": False},
    "fft": {"n_fft": 2048, "window": "hanning", "log_scale": True}
}
r = requests.post(f"{BASE}/api/render/plot", json=payload, params={"plot_type": "oscilloscope"})
with open(os.path.join(OUT_DIR, "plot_am_modulation.png"), "wb") as f:
    f.write(r.content)
print(f"  -> plot_am_modulation.png ({len(r.content)} bytes)")

# 4. FM spectrum via POST
print("Generating FM spectrum plot...")
payload["generator"]["modulation_type"] = "fm"
payload["generator"]["mod_index"] = 1.5
r = requests.post(f"{BASE}/api/render/plot", json=payload, params={"plot_type": "spectrum"})
with open(os.path.join(OUT_DIR, "plot_fm_spectrum.png"), "wb") as f:
    f.write(r.content)
print(f"  -> plot_fm_spectrum.png ({len(r.content)} bytes)")

print("\nAll plots generated successfully.")
