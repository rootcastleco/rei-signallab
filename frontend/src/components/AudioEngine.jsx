import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio, ShieldCheck } from 'lucide-react';

export default function AudioEngine({ generatorConfig, filterConfig }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const filterRef = useRef(null);
  const gainRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch (e) {}
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create Nodes
      const osc = ctx.createOscillator();
      const biquadFilter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      // Configure Oscillator Type
      const wType = generatorConfig.waveform;
      if (['sine', 'square', 'triangle', 'sawtooth'].includes(wType)) {
        osc.type = wType;
      } else {
        osc.type = 'sine';
      }

      osc.frequency.setValueAtTime(generatorConfig.frequency, ctx.currentTime);

      // Configure Filter
      if (filterConfig.enabled) {
        biquadFilter.type = filterConfig.filter_type || 'lowpass';
        biquadFilter.frequency.setValueAtTime(filterConfig.cutoff, ctx.currentTime);
        biquadFilter.Q.setValueAtTime(filterConfig.order * 1.5, ctx.currentTime);
      } else {
        biquadFilter.type = 'allpass';
      }

      // Configure Gain Volume
      gain.gain.setValueAtTime(volume * (generatorConfig.amplitude / 2.0), ctx.currentTime);

      // Wire nodes
      osc.connect(biquadFilter);
      biquadFilter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscRef.current = osc;
      filterRef.current = biquadFilter;
      gainRef.current = gain;

    } catch (e) {
      console.warn("WebAudio initialization error:", e);
    }

    return () => {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch (e) {}
        oscRef.current.disconnect();
        oscRef.current = null;
      }
    };
  }, [isPlaying, generatorConfig.waveform]);

  // Dynamic updates while playing
  useEffect(() => {
    if (!isPlaying || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    if (oscRef.current) {
      oscRef.current.frequency.setTargetAtTime(generatorConfig.frequency, ctx.currentTime, 0.05);
    }
    if (filterRef.current && filterConfig.enabled) {
      filterRef.current.frequency.setTargetAtTime(filterConfig.cutoff, ctx.currentTime, 0.05);
    }
    if (gainRef.current) {
      gainRef.current.gain.setTargetAtTime(volume * (generatorConfig.amplitude / 2.0), ctx.currentTime, 0.05);
    }
  }, [generatorConfig.frequency, generatorConfig.amplitude, filterConfig.cutoff, filterConfig.enabled, volume, isPlaying]);

  return (
    <div className="glass-panel p-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 text-xs font-semibold ${
            isPlaying
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
          }`}
        >
          {isPlaying ? <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          <span>{isPlaying ? 'MUTE AUDIO DAC' : 'PLAY LIVE WEBAUDIO'}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-gray-400">Vol:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-amber-500"
          />
          <span className="text-amber-400 font-semibold">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono text-gray-400 border-l border-white/10 pl-4">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>WebAudio API synth ready</span>
      </div>
    </div>
  );
}
