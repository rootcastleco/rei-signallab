import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..python_engine import PythonSandboxEngine

class PythonSandboxExecNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        code = str(self.params.get("python_code", "output_signal = input_signal * 2.0"))

        if sig_frame and sig_frame.data is not None:
            in_sig = np.asarray(sig_frame.data, dtype=np.float64).tolist()
            fs = sig_frame.metadata.sample_rate_hz or 1000.0
        else:
            in_sig = [1.0, 2.0, 3.0, 4.0, 5.0]
            fs = 1000.0

        res = PythonSandboxEngine.execute_script(
            code, variables={"input_signal": in_sig, "sample_rate": fs}
        )
        meta = FrameMetadata(sample_rate_hz=fs)

        # The script assigns `output_signal`; if it produced nothing (or the
        # sandbox rejected the script) the node passes its input through.
        out_data = res.get("output_signal") or in_sig
        out_arr = np.asarray(out_data, dtype=np.float64)

        return {
            "signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=out_arr),
            "result_data": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=res)
        }
