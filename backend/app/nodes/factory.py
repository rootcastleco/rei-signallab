from typing import Dict, Any, Type
from .base import BaseNodeRuntime
from .analysis import NoiseStatsNode, PatternDetectorNode, MinMaxNode, MeanNode
from .arithmetic import AddNode, SubtractNode, MultiplyNode, DivideNode, ApplyWindowNode, ApplyRealConstantNode, SquareNode
from .converters import ComplexToRealNode, RealToComplexNode, CartesianToPolarNode, PolarToCartesianNode, HilbertNode, PowerSpectrumNode, RealTodBNode, ChangeRangeNode
from .filters import LowPassNode, HighPassNode, BandPassNode, BandStopNode, BiQuadIirNode, MedianNode, RemoveDCNode, DelayLineNode
from .generic import GenericRealValueFilterNode
from .generators import SignalGeneratorNode, GaussianNoiseNode
from .meters import RMSMeterNode
from .timing import WatchdogNode, FrequencyMeterNode, CounterNode
from .transforms import FFTNode, InverseRealFFTNode, DFTNode, DCTNode, GoertzelNode, HaarNode
from .visualization import ScopeNode, WaterfallNode
from .vibration import (
    SensorCalibrationNode, AccelerationToVelocityNode, VelocityToDisplacementNode,
    OverallRMSNode, PeakNode, CrestFactorNode, KurtosisNode,
    BearingFrequenciesNode, EnvelopeAnalysisNode, SinglePlaneBalancingNode, FaultClassifierNode
)
from .electrical import ElectricalPowerMetricsNode, ElectricalSymmetricalComponentsNode
from .antenna import AntennaVswrNode, AntennaFriisNode, AntennaWaveguideNode
from .gps import GpsGoldCodeNode, GpsGeodeticToEcefNode, GpsConstellationSimNode
from .srw import SrwBeamKinematicsNode, SrwWavefrontIntensityNode
from .unpingco import (
    DspLabAliasingNode, DspLabParksMcClellanNode, DspLabAutocorrPitchNode,
    DspLabLmsAdaptiveCancellerNode, DspLabCwtScalogramNode
)
from .sandbox import PythonSandboxExecNode

class NodeFactory:
    """
    Central Node Factory mapping canonical node type strings to NodeRuntime classes.
    Supports all domain modules: Analysis, Arithmetic, Converters, Filters, Generic, Generators,
    Meters, Timing, Transformations, Visualization, Vibration Analysis, Electrical Power Quality,
    Antenna & RF Waveguide, GPS SDR Simulation, SRW Synchrotron Radiation, DSP Lab, and Python Sandbox.
    """
    _mapping: Dict[str, Type[BaseNodeRuntime]] = {
        # Analysis
        "analysis.noise_stats": NoiseStatsNode,
        "analysis.pattern_detector": PatternDetectorNode,
        "analysis.min_max": MinMaxNode,
        "analysis.mean": MeanNode,

        # Arithmetic
        "arithmetic.add": AddNode,
        "arithmetic.subtract": SubtractNode,
        "arithmetic.multiply": MultiplyNode,
        "arithmetic.divide": DivideNode,
        "arithmetic.apply_window": ApplyWindowNode,
        "arithmetic.apply_real_constant": ApplyRealConstantNode,
        "arithmetic.square": SquareNode,

        # Converters
        "converter.complex_to_real": ComplexToRealNode,
        "converter.real_to_complex": RealToComplexNode,
        "converter.cartesian_to_polar": CartesianToPolarNode,
        "converter.polar_to_cartesian": PolarToCartesianNode,
        "transform.hilbert": HilbertNode,
        "transform.power_spectrum": PowerSpectrumNode,
        "converter.real_to_db": RealTodBNode,
        "converter.change_range": ChangeRangeNode,

        # Filters
        "filter.lowpass": LowPassNode,
        "filter.highpass": HighPassNode,
        "filter.bandpass": BandPassNode,
        "filter.bandstop": BandStopNode,
        "filter.biquad_iir": BiQuadIirNode,
        "filter.median": MedianNode,
        "filter.remove_dc": RemoveDCNode,
        "filter.delay_line": DelayLineNode,

        # Generic / Custom
        "generic.real_value_filter": GenericRealValueFilterNode,

        # Generators
        "generator.signal": SignalGeneratorNode,
        "generator.gaussian_noise": GaussianNoiseNode,

        # Meters
        "meter.rms": RMSMeterNode,

        # Timing
        "timing.watchdog": WatchdogNode,
        "timing.frequency_meter": FrequencyMeterNode,
        "timing.counter": CounterNode,

        # Transformations
        "transform.fft": FFTNode,
        "transform.inverse_real_fft": InverseRealFFTNode,
        "transform.dft": DFTNode,
        "transform.dct": DCTNode,
        "transform.goertzel": GoertzelNode,
        "transform.haar": HaarNode,

        # Visualization
        "visualization.scope": ScopeNode,
        "visualization.waterfall": WaterfallNode,

        # Vibration Analysis
        "vibration.sensor_calibration": SensorCalibrationNode,
        "vibration.acceleration_to_velocity": AccelerationToVelocityNode,
        "vibration.velocity_to_displacement": VelocityToDisplacementNode,
        "vibration.overall_rms": OverallRMSNode,
        "vibration.peak": PeakNode,
        "vibration.crest_factor": CrestFactorNode,
        "vibration.kurtosis": KurtosisNode,
        "vibration.bearing_frequencies": BearingFrequenciesNode,
        "vibration.envelope_analysis": EnvelopeAnalysisNode,
        "vibration.balance.single_plane": SinglePlaneBalancingNode,
        "vibration.fault_classifier": FaultClassifierNode,

        # Electrical Power Engineering
        "electrical.power_metrics": ElectricalPowerMetricsNode,
        "electrical.symmetrical_components": ElectricalSymmetricalComponentsNode,

        # Antenna & RF Waveguide
        "antenna.vswr_return_loss": AntennaVswrNode,
        "antenna.friis_link_budget": AntennaFriisNode,
        "antenna.waveguide_cutoff": AntennaWaveguideNode,

        # GPS SDR Simulation
        "gps.gold_code_gen": GpsGoldCodeNode,
        "gps.geodetic_to_ecef": GpsGeodeticToEcefNode,
        "gps.constellation_sim": GpsConstellationSimNode,

        # SRW Synchrotron Radiation
        "srw.beam_kinematics": SrwBeamKinematicsNode,
        "srw.wavefront_intensity": SrwWavefrontIntensityNode,

        # DSP Lab / Unpingco Workbench
        "dsp_lab.aliasing_simulator": DspLabAliasingNode,
        "dsp_lab.parks_mcclellan_fir": DspLabParksMcClellanNode,
        "dsp_lab.autocorr_pitch": DspLabAutocorrPitchNode,
        "dsp_lab.lms_adaptive_canceller": DspLabLmsAdaptiveCancellerNode,
        "dsp_lab.cwt_scalogram": DspLabCwtScalogramNode,

        # Sandbox Python Execution
        "sandbox.python_exec": PythonSandboxExecNode
    }

    @classmethod
    def create(cls, canonical_type: str, node_id: str, name: str, params: Dict[str, Any] = None) -> BaseNodeRuntime:
        node_cls = cls._mapping.get(canonical_type)
        if not node_cls:
            raise ValueError(f"No runtime implementation registered for canonical type '{canonical_type}'.")
        return node_cls(canonical_type, node_id, name, params)
