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

class NodeFactory:
    """
    Central Node Factory mapping canonical node type strings to NodeRuntime classes.
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
        "visualization.waterfall": WaterfallNode
    }

    @classmethod
    def create(cls, canonical_type: str, node_id: str, name: str, params: Dict[str, Any] = None) -> BaseNodeRuntime:
        node_cls = cls._mapping.get(canonical_type)
        if not node_cls:
            raise ValueError(f"No runtime implementation registered for canonical type '{canonical_type}'.")
        return node_cls(canonical_type, node_id, name, params)
