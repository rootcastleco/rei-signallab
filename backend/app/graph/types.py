from enum import Enum
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field, ConfigDict
import numpy as np

class CanonicalPortType(str, Enum):
    SIGNAL_REAL64 = "Signal<Real64>"
    SIGNAL_REAL32 = "Signal<Real32>"
    SIGNAL_INT64 = "Signal<Int64>"
    SIGNAL_INT32 = "Signal<Int32>"
    SIGNAL_COMPLEX128 = "Signal<Complex128>"
    SIGNAL_COMPLEX64 = "Signal<Complex64>"

    SCALAR_REAL64 = "Scalar<Real64>"
    SCALAR_INT64 = "Scalar<Int64>"
    SCALAR_BOOL = "Scalar<Bool>"

    MATRIX_REAL64 = "Matrix<Real64>"
    MATRIX_INT64 = "Matrix<Int64>"
    MATRIX_COMPLEX128 = "Matrix<Complex128>"

    SPECTRUM_FRAME = "SpectrumFrame"
    POWER_SPECTRUM_FRAME = "PowerSpectrumFrame"
    POLAR_FRAME = "PolarFrame"
    AUDIO_FRAME = "AudioFrame"
    MEDIA_FRAME = "MediaFrame"
    BINARY_BUFFER = "BinaryBuffer"
    STRUCTURED_FRAME = "StructuredFrame"
    TRIGGER_EVENT = "TriggerEvent"
    CLOCK_EVENT = "ClockEvent"
    PATTERN_EVENT = "PatternEvent"
    RENDERABLE_LAYER = "RenderableLayer"
    ANY = "*"

class FrameMetadata(BaseModel):
    sample_rate_hz: float = 44100.0
    timestamp_ns: int = 0
    frame_id: str = ""
    channel_count: int = 1
    units: str = "V"
    calibration: float = 1.0
    source_id: str = ""
    sequence_number: int = 0
    valid_sample_count: int = 0

class Frame(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    data_type: str
    metadata: FrameMetadata = Field(default_factory=FrameMetadata)
    data: Any = None
    metrics: Optional[Dict[str, Any]] = None
