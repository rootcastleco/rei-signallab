from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from .types import CanonicalPortType

class PortSpec(BaseModel):
    name: str
    data_type: str
    required: bool = True
    multiple: bool = False
    description: str = ""

class NodeSpec(BaseModel):
    type: str
    version: str = "2.1.0"
    category: str
    display_name: str
    aliases: List[str] = Field(default_factory=list)

    input_ports: List[PortSpec] = Field(default_factory=list)
    output_ports: List[PortSpec] = Field(default_factory=list)

    parameter_schema: Dict[str, Any] = Field(default_factory=dict)

    deterministic: bool = True
    stateful: bool = False
    realtime_safe: bool = True
    browser_supported: bool = True
    backend_supported: bool = True
    implemented: bool = True

    documentation: str = ""

class NodeRegistry:
    _nodes: Dict[str, NodeSpec] = {}
    _alias_map: Dict[str, str] = {}

    @classmethod
    def register(cls, spec: NodeSpec):
        cls._nodes[spec.type] = spec
        for alias in spec.aliases:
            cls._alias_map[alias] = spec.type

    @classmethod
    def get(cls, node_type_or_alias: str) -> Optional[NodeSpec]:
        canonical_type = cls._alias_map.get(node_type_or_alias, node_type_or_alias)
        return cls._nodes.get(canonical_type)

    @classmethod
    def list_all(cls) -> List[NodeSpec]:
        return list(cls._nodes.values())

    @classmethod
    def resolve_canonical_type(cls, name: str) -> str:
        return cls._alias_map.get(name, name)


# Register All Canonical DSP Component Specifications
def _init_registry():
    # 1. Analysis
    NodeRegistry.register(NodeSpec(
        type="analysis.noise_stats",
        category="Analysis",
        display_name="Noise Statistics & THD/SNR Analyzer",
        aliases=["SLNoiseStats"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal Vector")],
        output_ports=[
            PortSpec(name="stats", data_type=CanonicalPortType.STRUCTURED_FRAME, description="Full Statistics Object"),
            PortSpec(name="fundamental_frequency", data_type=CanonicalPortType.SCALAR_REAL64, description="Peak Fundamental Freq (Hz)"),
            PortSpec(name="snr_db", data_type=CanonicalPortType.SCALAR_REAL64, description="Signal-to-Noise Ratio (dB)"),
            PortSpec(name="thd_db", data_type=CanonicalPortType.SCALAR_REAL64, description="Total Harmonic Distortion (dB)"),
            PortSpec(name="thd_percent", data_type=CanonicalPortType.SCALAR_REAL64, description="Total Harmonic Distortion (%)"),
            PortSpec(name="sinad_db", data_type=CanonicalPortType.SCALAR_REAL64, description="SINAD (dB)"),
            PortSpec(name="sfdr_db", data_type=CanonicalPortType.SCALAR_REAL64, description="SFDR (dB)"),
            PortSpec(name="enob_bits", data_type=CanonicalPortType.SCALAR_REAL64, description="ENOB (bits)")
        ],
        parameter_schema={
            "fundamental_search_min_hz": {"type": "number", "default": 10.0},
            "fundamental_search_max_hz": {"type": "number", "default": 20000.0},
            "harmonic_count": {"type": "integer", "default": 5}
        },
        documentation="Instrument-grade coherent gain corrected noise & harmonic distortion statistics."
    ))

    NodeRegistry.register(NodeSpec(
        type="analysis.pattern_detector",
        category="Analysis",
        display_name="Pattern & Template Detector",
        aliases=["SLPatternDetector"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Target Signal")],
        output_ports=[
            PortSpec(name="events", data_type=CanonicalPortType.PATTERN_EVENT, description="Detected Pattern Events"),
            PortSpec(name="score_signal", data_type=CanonicalPortType.SIGNAL_REAL64, description="Cross-Correlation Score"),
            PortSpec(name="match_count", data_type=CanonicalPortType.SCALAR_INT64, description="Total Match Count")
        ],
        parameter_schema={
            "threshold": {"type": "number", "default": 0.85},
            "method": {"type": "string", "enum": ["normalized_cross_correlation", "euclidean_distance", "cosine_similarity"], "default": "normalized_cross_correlation"}
        },
        documentation="Pattern & template detector using normalized cross-correlation."
    ))

    NodeRegistry.register(NodeSpec(
        type="analysis.min_max",
        category="Analysis",
        display_name="Min / Max Extrema Finder",
        aliases=["SLMinMax"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[
            PortSpec(name="min_value", data_type=CanonicalPortType.SCALAR_REAL64, description="Minimum Value"),
            PortSpec(name="max_value", data_type=CanonicalPortType.SCALAR_REAL64, description="Maximum Value"),
            PortSpec(name="peak_to_peak", data_type=CanonicalPortType.SCALAR_REAL64, description="Peak-to-Peak Amplitude")
        ],
        parameter_schema={},
        documentation="Finds min, max, and peak-to-peak amplitude."
    ))

    NodeRegistry.register(NodeSpec(
        type="analysis.mean",
        category="Analysis",
        display_name="Mean & DC Level Evaluator",
        aliases=["SLMean"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="mean_value", data_type=CanonicalPortType.SCALAR_REAL64, description="DC Mean Value")],
        parameter_schema={},
        documentation="Evaluates signal mean value (DC offset)."
    ))

    # 2. Arithmetic
    NodeRegistry.register(NodeSpec(
        type="arithmetic.add",
        category="Arithmetic",
        display_name="Signal Addition (x + y)",
        aliases=["SLAdd"],
        input_ports=[
            PortSpec(name="signal_in_a", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal A"),
            PortSpec(name="signal_in_b", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal B")
        ],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Sum Output Signal")],
        parameter_schema={},
        documentation="Sample-by-sample addition of two signals."
    ))

    NodeRegistry.register(NodeSpec(
        type="arithmetic.subtract",
        category="Arithmetic",
        display_name="Signal Subtraction (x - y)",
        aliases=["SLSubtract"],
        input_ports=[
            PortSpec(name="signal_in_a", data_type=CanonicalPortType.SIGNAL_REAL64, description="Minuend A"),
            PortSpec(name="signal_in_b", data_type=CanonicalPortType.SIGNAL_REAL64, description="Subtrahend B")
        ],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Difference Output")],
        parameter_schema={},
        documentation="Sample-by-sample subtraction."
    ))

    NodeRegistry.register(NodeSpec(
        type="arithmetic.multiply",
        category="Arithmetic",
        display_name="Signal Multiplication (x * y)",
        aliases=["SLMultiply"],
        input_ports=[
            PortSpec(name="signal_in_a", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal A"),
            PortSpec(name="signal_in_b", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal B")
        ],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Product Output Signal")],
        parameter_schema={},
        documentation="Sample-by-sample multiplication."
    ))

    NodeRegistry.register(NodeSpec(
        type="arithmetic.divide",
        category="Arithmetic",
        display_name="Signal Division (x / y)",
        aliases=["SLDivide"],
        input_ports=[
            PortSpec(name="signal_in_a", data_type=CanonicalPortType.SIGNAL_REAL64, description="Numerator A"),
            PortSpec(name="signal_in_b", data_type=CanonicalPortType.SIGNAL_REAL64, description="Denominator B")
        ],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Quotient Output")],
        parameter_schema={"zero_handling": {"type": "string", "enum": ["ERROR", "NAN", "CLAMP_EPSILON", "ZERO"], "default": "CLAMP_EPSILON"}},
        documentation="Sample-by-sample division with configurable zero-division guard."
    ))

    NodeRegistry.register(NodeSpec(
        type="arithmetic.apply_window",
        category="Arithmetic",
        display_name="Window Function Operator",
        aliases=["SLApplyWindow"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Unwindowed Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Windowed Signal Output")],
        parameter_schema={"window_type": {"type": "string", "enum": ["Hann", "Hamming", "Blackman", "Flat Top", "Rectangular"], "default": "Hann"}},
        documentation="Applies windowing function (Hann, Hamming, Blackman, Flat Top)."
    ))

    NodeRegistry.register(NodeSpec(
        type="arithmetic.apply_real_constant",
        category="Arithmetic",
        display_name="Apply Real Constant Scalar",
        aliases=["SLApplyRealConst"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Scaled Output")],
        parameter_schema={"constant": {"type": "number", "default": 1.0}, "operation": {"type": "string", "enum": ["multiply", "add"], "default": "multiply"}},
        documentation="Multiplies or adds a real scalar constant."
    ))

    # 3. Converters
    NodeRegistry.register(NodeSpec(
        type="converter.complex_to_real",
        category="Converters",
        display_name="Complex to Real & Imaginary Splitter",
        aliases=["SLComplexToReal"],
        input_ports=[PortSpec(name="complex_in", data_type=CanonicalPortType.SIGNAL_COMPLEX128, description="Complex Input Signal")],
        output_ports=[
            PortSpec(name="real", data_type=CanonicalPortType.SIGNAL_REAL64, description="Real Component"),
            PortSpec(name="imaginary", data_type=CanonicalPortType.SIGNAL_REAL64, description="Imaginary Component"),
            PortSpec(name="magnitude", data_type=CanonicalPortType.SIGNAL_REAL64, description="Magnitude Vector"),
            PortSpec(name="phase", data_type=CanonicalPortType.SIGNAL_REAL64, description="Phase Angle Vector")
        ],
        parameter_schema={},
        documentation="Decomposes complex signals into real, imaginary, magnitude, and phase components."
    ))

    NodeRegistry.register(NodeSpec(
        type="converter.real_to_complex",
        category="Converters",
        display_name="Real & Imaginary to Complex Combiner",
        aliases=["SLRealToComplex"],
        input_ports=[
            PortSpec(name="real", data_type=CanonicalPortType.SIGNAL_REAL64, description="Real Part"),
            PortSpec(name="imaginary", data_type=CanonicalPortType.SIGNAL_REAL64, description="Imaginary Part")
        ],
        output_ports=[PortSpec(name="complex_out", data_type=CanonicalPortType.SIGNAL_COMPLEX128, description="Complex Signal Output")],
        parameter_schema={},
        documentation="Combines real and imaginary signals into complex format."
    ))

    NodeRegistry.register(NodeSpec(
        type="converter.cartesian_to_polar",
        category="Converters",
        display_name="Cartesian to Polar Converter (r, theta)",
        aliases=["SLCartToPolar"],
        input_ports=[
            PortSpec(name="x", data_type=CanonicalPortType.SIGNAL_REAL64, description="X Axis / Real"),
            PortSpec(name="y", data_type=CanonicalPortType.SIGNAL_REAL64, description="Y Axis / Imaginary")
        ],
        output_ports=[
            PortSpec(name="r", data_type=CanonicalPortType.SIGNAL_REAL64, description="Radius Magnitude"),
            PortSpec(name="theta", data_type=CanonicalPortType.SIGNAL_REAL64, description="Phase Angle (Radians)")
        ],
        parameter_schema={},
        documentation="Converts Cartesian coordinates (x, y) to Polar (r, theta)."
    ))

    NodeRegistry.register(NodeSpec(
        type="converter.polar_to_cartesian",
        category="Converters",
        display_name="Polar to Cartesian Converter (x, y)",
        aliases=["SLPolarToCart"],
        input_ports=[
            PortSpec(name="r", data_type=CanonicalPortType.SIGNAL_REAL64, description="Radius Magnitude"),
            PortSpec(name="theta", data_type=CanonicalPortType.SIGNAL_REAL64, description="Phase Angle (Radians)")
        ],
        output_ports=[
            PortSpec(name="x", data_type=CanonicalPortType.SIGNAL_REAL64, description="X Axis"),
            PortSpec(name="y", data_type=CanonicalPortType.SIGNAL_REAL64, description="Y Axis")
        ],
        parameter_schema={},
        documentation="Converts Polar coordinates (r, theta) to Cartesian (x, y)."
    ))

    NodeRegistry.register(NodeSpec(
        type="transform.hilbert",
        category="Converters",
        display_name="Hilbert Transform & Envelope Follower",
        aliases=["SLHilbert"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Real Input Signal")],
        output_ports=[
            PortSpec(name="analytic_signal", data_type=CanonicalPortType.SIGNAL_COMPLEX128, description="Complex Analytic Signal"),
            PortSpec(name="envelope", data_type=CanonicalPortType.SIGNAL_REAL64, description="Instantaneous Amplitude Envelope"),
            PortSpec(name="instantaneous_phase", data_type=CanonicalPortType.SIGNAL_REAL64, description="Instantaneous Phase Angle")
        ],
        parameter_schema={},
        documentation="Computes analytic signal and instantaneous envelope via SciPy Hilbert transform."
    ))

    NodeRegistry.register(NodeSpec(
        type="arithmetic.square",
        category="Converters",
        display_name="Sample-wise Square Operator (x²)",
        aliases=["SLToSquare"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Squared Output")],
        parameter_schema={},
        documentation="Computes sample-by-sample square: y[n] = x[n]²."
    ))

    NodeRegistry.register(NodeSpec(
        type="transform.power_spectrum",
        category="Converters",
        display_name="Power Spectrum & PSD Evaluator",
        aliases=["SLPowerSpectrum"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Time Domain Signal")],
        output_ports=[PortSpec(name="power_spectrum", data_type=CanonicalPortType.POWER_SPECTRUM_FRAME, description="Power Spectrum Frame")],
        parameter_schema={"n_fft": {"type": "integer", "default": 1024}, "mode": {"type": "string", "enum": ["power_spectral_density", "magnitude_squared"], "default": "power_spectral_density"}},
        documentation="Computes Power Spectrum Density (PSD) using Welch's or Periodogram method."
    ))

    NodeRegistry.register(NodeSpec(
        type="converter.real_to_db",
        category="Converters",
        display_name="Linear to dB Converter",
        aliases=["SLRealTodB"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Linear Amplitude/Power")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Logarithmic dB Signal")],
        parameter_schema={"mode": {"type": "string", "enum": ["AMPLITUDE_DB", "POWER_DB"], "default": "AMPLITUDE_DB"}, "reference": {"type": "number", "default": 1.0}},
        documentation="Converts linear amplitude/power values to decibels (dB)."
    ))

    NodeRegistry.register(NodeSpec(
        type="converter.change_range",
        category="Converters",
        display_name="Linear Range Rescaler",
        aliases=["SLChangeRange"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Rescaled Output")],
        parameter_schema={
            "input_min": {"type": "number", "default": -1.0},
            "input_max": {"type": "number", "default": 1.0},
            "output_min": {"type": "number", "default": 0.0},
            "output_max": {"type": "number", "default": 100.0},
            "clamp": {"type": "boolean", "default": True}
        },
        documentation="Linear range mapping with optional clamping: out = out_min + ((x - in_min)/(in_max - in_min))*(out_max - out_min)."
    ))

    # 4. Filters
    NodeRegistry.register(NodeSpec(
        type="filter.lowpass",
        category="Filters",
        display_name="LowPass Filter (IIR / FIR)",
        aliases=["SLLowPass"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Unfiltered Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="LowPass Filtered Output")],
        parameter_schema={"cutoff": {"type": "number", "default": 1000.0}, "order": {"type": "integer", "default": 4}, "filter_design": {"type": "string", "enum": ["butterworth", "chebyshev1", "fir_window"], "default": "butterworth"}},
        stateful=True,
        documentation="LowPass IIR/FIR filter with pole stability validation."
    ))

    NodeRegistry.register(NodeSpec(
        type="filter.highpass",
        category="Filters",
        display_name="HighPass Filter",
        aliases=["SLHighPass"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Unfiltered Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="HighPass Filtered Output")],
        parameter_schema={"cutoff": {"type": "number", "default": 100.0}, "order": {"type": "integer", "default": 4}},
        stateful=True,
        documentation="HighPass Butterworth IIR filter."
    ))

    NodeRegistry.register(NodeSpec(
        type="filter.bandpass",
        category="Filters",
        display_name="BandPass Filter",
        aliases=["SLBandPass"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Unfiltered Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="BandPass Filtered Output")],
        parameter_schema={"low_cutoff": {"type": "number", "default": 300.0}, "high_cutoff": {"type": "number", "default": 3000.0}, "order": {"type": "integer", "default": 4}},
        stateful=True,
        documentation="BandPass IIR filter."
    ))

    NodeRegistry.register(NodeSpec(
        type="filter.bandstop",
        category="Filters",
        display_name="BandStop / Notch Filter",
        aliases=["SLBandStop"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Unfiltered Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Notch Filtered Output")],
        parameter_schema={"low_cutoff": {"type": "number", "default": 48.0}, "high_cutoff": {"type": "number", "default": 52.0}, "order": {"type": "integer", "default": 4}},
        stateful=True,
        documentation="BandStop / 50Hz Notch IIR filter."
    ))

    NodeRegistry.register(NodeSpec(
        type="filter.biquad_iir",
        category="Filters",
        display_name="Biquad IIR Second-Order Section",
        aliases=["SLBiQuadIir"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Filtered Output")],
        parameter_schema={"b0": {"type": "number", "default": 0.1}, "b1": {"type": "number", "default": 0.2}, "b2": {"type": "number", "default": 0.1}, "a1": {"type": "number", "default": -0.5}, "a2": {"type": "number", "default": 0.25}},
        stateful=True,
        documentation="Cascaded Biquad Second-Order Section (SOS) IIR Filter."
    ))

    NodeRegistry.register(NodeSpec(
        type="filter.median",
        category="Filters",
        display_name="Median Filter (Spike & Noise Removal)",
        aliases=["SLMedian"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Noisy Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Median Filtered Signal")],
        parameter_schema={"kernel_size": {"type": "integer", "default": 5}},
        documentation="Non-linear median filter for spike and salt-and-pepper impulse noise removal."
    ))

    NodeRegistry.register(NodeSpec(
        type="filter.remove_dc",
        category="Filters",
        display_name="DC Offset Removal Filter",
        aliases=["SLRemoveDC"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Signal with DC Bias")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Zero-DC Signal")],
        parameter_schema={},
        documentation="Subtracts sample mean to remove static DC bias."
    ))

    NodeRegistry.register(NodeSpec(
        type="filter.delay_line",
        category="Filters",
        display_name="Stateful Delay Line",
        aliases=["SLDelayLine"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Delayed Output Signal")],
        parameter_schema={"delay_samples": {"type": "integer", "default": 10}, "initial_value": {"type": "number", "default": 0.0}},
        stateful=True,
        documentation="Stateful sample delay buffer."
    ))

    # 5. Generic Restricted Expression Filter
    NodeRegistry.register(NodeSpec(
        type="generic.real_value_filter",
        category="Custom",
        display_name="Restricted Math Expression Filter",
        aliases=["SLGenericRealValue"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal x")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Evaluated Expression Output")],
        parameter_schema={"expression": {"type": "string", "default": "sin(2 * 3.14159 * 440 * t) + 0.5 * x"}},
        documentation="Evaluates mathematical expressions safely using restricted AST evaluator (x, index, sample_rate, sin, cos, sqrt, abs, exp)."
    ))

    # 6. Generators
    NodeRegistry.register(NodeSpec(
        type="generator.signal",
        category="Generators",
        display_name="Signal Waveform Generator",
        aliases=["SLSignalGen"],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Generated Signal Output")],
        parameter_schema={
            "waveform": {"type": "string", "enum": ["sine", "square", "triangle", "sawtooth", "noise", "ecg", "chirp"], "default": "sine"},
            "frequency": {"type": "number", "default": 440.0},
            "amplitude": {"type": "number", "default": 1.0},
            "phase": {"type": "number", "default": 0.0},
            "offset": {"type": "number", "default": 0.0},
            "sample_rate": {"type": "integer", "default": 44100},
            "duration": {"type": "number", "default": 0.1}
        },
        documentation="Synthesizes sine, square, triangle, sawtooth, noise, ECG, and chirp waveforms."
    ))

    NodeRegistry.register(NodeSpec(
        type="generator.gaussian_noise",
        category="Generators",
        display_name="Gaussian White Noise Generator",
        aliases=["SLGaussGen"],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Noise Output")],
        parameter_schema={"std_dev": {"type": "number", "default": 1.0}, "seed": {"type": "integer", "default": 42}},
        documentation="Synthesizes Gaussian white noise with deterministic seed support."
    ))

    # 7. Meters
    NodeRegistry.register(NodeSpec(
        type="meter.rms",
        category="Meters",
        display_name="True RMS Voltage Meter",
        aliases=["SLRMSMeter"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[
            PortSpec(name="rms_value", data_type=CanonicalPortType.SCALAR_REAL64, description="Scalar RMS Value"),
            PortSpec(name="rms_signal", data_type=CanonicalPortType.SIGNAL_REAL64, description="Sliding RMS Envelope")
        ],
        parameter_schema={"window_samples": {"type": "integer", "default": 128}},
        documentation="Computes True RMS amplitude scalar value and sliding envelope."
    ))

    # 8. Timing
    NodeRegistry.register(NodeSpec(
        type="timing.watchdog",
        category="Timing",
        display_name="Watchdog Timeout Timer",
        aliases=["TLWatchDogTimer"],
        input_ports=[PortSpec(name="trigger", data_type=CanonicalPortType.TRIGGER_EVENT, description="Reset Trigger Event")],
        output_ports=[PortSpec(name="healthy", data_type=CanonicalPortType.SCALAR_BOOL, description="Watchdog Status")],
        parameter_schema={"timeout_ms": {"type": "number", "default": 1000.0}},
        stateful=True,
        documentation="Monitors event execution intervals and flags timeouts."
    ))

    NodeRegistry.register(NodeSpec(
        type="timing.frequency_meter",
        category="Timing",
        display_name="Zero-Crossing Frequency Counter",
        aliases=["TLFrequencyMeter"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="measured_frequency", data_type=CanonicalPortType.SCALAR_REAL64, description="Measured Freq (Hz)")],
        parameter_schema={},
        documentation="Measures fundamental frequency via zero-crossing interpolation."
    ))

    NodeRegistry.register(NodeSpec(
        type="timing.counter",
        category="Timing",
        display_name="Event & Pulse Counter",
        aliases=["TLCounter"],
        input_ports=[PortSpec(name="clock", data_type=CanonicalPortType.CLOCK_EVENT, description="Clock Event")],
        output_ports=[PortSpec(name="count", data_type=CanonicalPortType.SCALAR_INT64, description="Accumulated Count")],
        parameter_schema={"mode": {"type": "string", "enum": ["UP", "DOWN", "MODULO"], "default": "UP"}, "modulo": {"type": "integer", "default": 100}},
        stateful=True,
        documentation="Accumulates event pulses with modulo overflow management."
    ))

    # 9. Transformations
    NodeRegistry.register(NodeSpec(
        type="transform.fft",
        category="Transformations",
        display_name="Fast Fourier Transform (FFT)",
        aliases=["SLFourier"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Time Signal Vector")],
        output_ports=[
            PortSpec(name="spectrum_out", data_type=CanonicalPortType.SPECTRUM_FRAME, description="Spectrum Frame"),
            PortSpec(name="magnitude", data_type=CanonicalPortType.SIGNAL_REAL64, description="Magnitude Spectrum dB"),
            PortSpec(name="phase", data_type=CanonicalPortType.SIGNAL_REAL64, description="Phase Spectrum Radians"),
            PortSpec(name="frequency_axis", data_type=CanonicalPortType.SIGNAL_REAL64, description="Frequency Bins Hz")
        ],
        parameter_schema={"n_fft": {"type": "integer", "default": 1024}, "window": {"type": "string", "default": "hanning"}},
        documentation="Forward Fast Fourier Transform using SciPy FFT engine."
    ))

    NodeRegistry.register(NodeSpec(
        type="transform.inverse_real_fft",
        category="Transformations",
        display_name="Inverse FFT Reconstruction (IFFT)",
        aliases=["SLInverseFourier"],
        input_ports=[PortSpec(name="spectrum_in", data_type=CanonicalPortType.SPECTRUM_FRAME, description="Spectrum Frame")],
        output_ports=[PortSpec(name="signal_out", data_type=CanonicalPortType.SIGNAL_REAL64, description="Reconstructed Time Signal")],
        parameter_schema={},
        documentation="Reconstructs time-domain signal from complex spectrum frame."
    ))

    NodeRegistry.register(NodeSpec(
        type="transform.dft",
        category="Transformations",
        display_name="Discrete Fourier Transform (O(N²))",
        aliases=["SLDft"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Time Signal")],
        output_ports=[PortSpec(name="spectrum_out", data_type=CanonicalPortType.SPECTRUM_FRAME, description="Spectrum Frame")],
        parameter_schema={"max_dft_size": {"type": "integer", "default": 512}},
        documentation="Explicit Discrete Fourier Transform matrix multiplication with safe size guard."
    ))

    NodeRegistry.register(NodeSpec(
        type="transform.dct",
        category="Transformations",
        display_name="Discrete Cosine Transform (DCT Type II)",
        aliases=["SLDct"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="dct_coefficients", data_type=CanonicalPortType.SIGNAL_REAL64, description="DCT Output Coefficients")],
        parameter_schema={"dct_type": {"type": "integer", "default": 2}},
        documentation="Discrete Cosine Transform (DCT Type II)."
    ))

    NodeRegistry.register(NodeSpec(
        type="transform.goertzel",
        category="Transformations",
        display_name="Goertzel Single Frequency Tone Detector",
        aliases=["SLGoertzOne"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[PortSpec(name="target_magnitude", data_type=CanonicalPortType.SCALAR_REAL64, description="Magnitude at Target Freq")],
        parameter_schema={"target_frequency_hz": {"type": "number", "default": 440.0}},
        documentation="Efficient O(N) single frequency tone magnitude evaluator."
    ))

    NodeRegistry.register(NodeSpec(
        type="transform.haar",
        category="Transformations",
        display_name="Haar Discrete Wavelet Transform",
        aliases=["SLHaar"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Signal")],
        output_ports=[
            PortSpec(name="approximation", data_type=CanonicalPortType.SIGNAL_REAL64, description="Lowpass Approx Coeffs"),
            PortSpec(name="detail", data_type=CanonicalPortType.SIGNAL_REAL64, description="Highpass Detail Coeffs")
        ],
        parameter_schema={},
        documentation="Single-level Haar wavelet decomposition."
    ))

    # 10. Visualization Sinks
    NodeRegistry.register(NodeSpec(
        type="visualization.scope",
        category="Visualization",
        display_name="CRT Oscilloscope Screen Sink",
        aliases=["SLScope"],
        input_ports=[PortSpec(name="signal_in", data_type=CanonicalPortType.SIGNAL_REAL64, description="Input Channel")],
        output_ports=[PortSpec(name="layer", data_type=CanonicalPortType.RENDERABLE_LAYER, description="Renderable Layer")],
        parameter_schema={"time_div": {"type": "number", "default": 2.0}, "volts_div": {"type": "number", "default": 1.0}},
        documentation="Multi-channel oscilloscope display sink."
    ))

    NodeRegistry.register(NodeSpec(
        type="visualization.waterfall",
        category="Visualization",
        display_name="2D Waterfall Spectrogram Sink",
        aliases=["SLWaterfall"],
        input_ports=[PortSpec(name="spectrum_in", data_type=CanonicalPortType.SPECTRUM_FRAME, description="Spectrum Input")],
        output_ports=[PortSpec(name="layer", data_type=CanonicalPortType.RENDERABLE_LAYER, description="Renderable Layer")],
        parameter_schema={"history_depth": {"type": "integer", "default": 50}},
        documentation="Time-frequency 2D waterfall spectrogram display sink."
    ))

# Execute Registry Initialization
_init_registry()
