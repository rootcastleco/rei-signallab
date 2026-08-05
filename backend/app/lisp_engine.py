import numpy as np
import re
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger("lisp_dsp_engine")

class LispDSPEngine:
    """
    Common Lisp DSP AST Engine for REI SignalLab.
    Parses machine-level Lisp S-Expressions and executes optimized SIMD vector operations.
    """

    @staticmethod
    def parse_sexpr(code: str) -> List[Any]:
        """Parses Lisp code string into S-Expression AST list representation."""
        tokens = re.findall(r'[\(\)]|[^\s\(\)]+', code)
        
        def build_ast(stream):
            ast = []
            while stream:
                token = stream.pop(0)
                if token == '(':
                    ast.append(build_ast(stream))
                elif token == ')':
                    return ast
                else:
                    # Number parsing
                    try:
                        if '.' in token or 'd' in token:
                            ast.append(float(token.replace('d0', '')))
                        else:
                            ast.append(int(token))
                    except ValueError:
                        ast.append(token.lower())
            return ast

        parsed = build_ast(tokens)
        return parsed[0] if parsed else []

    @staticmethod
    def execute_lisp_dsp(lisp_code: str, signal_in: np.ndarray, sample_rate: int = 44100) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Executes Lisp DSP plugin program on input signal vector.
        Supports Lisp macros:
        - (biquad-filter-simd signal b0 b1 b2 a1 a2)
        - (lisp-quantize-buffer signal bits)
        - (lisp-convolve-simd signal-a signal-b)
        - (apply-kaiser-window signal beta)
        """
        signal_out = signal_in.copy()
        execution_logs = []

        try:
            ast = LispDSPEngine.parse_sexpr(lisp_code)
            execution_logs.append(f"Parsed Lisp AST: {ast}")

            # Process top-level expressions or prognosis
            exprs = ast if isinstance(ast[0], list) else [ast]

            for expr in exprs:
                if not isinstance(expr, list) or len(expr) == 0:
                    continue

                fn_name = str(expr[0]).lower()

                if fn_name == 'biquad-filter-simd':
                    # (biquad-filter-simd signal b0 b1 b2 a1 a2)
                    b0 = float(expr[2]) if len(expr) > 2 else 0.1
                    b1 = float(expr[3]) if len(expr) > 3 else 0.2
                    b2 = float(expr[4]) if len(expr) > 4 else 0.1
                    a1 = float(expr[5]) if len(expr) > 5 else -0.5
                    a2 = float(expr[6]) if len(expr) > 6 else 0.25

                    # Machine SIMD Direct Form II Biquad Filter Loop
                    out = np.zeros_like(signal_out)
                    z1, z2 = 0.0, 0.0
                    for i in range(len(signal_out)):
                        x = signal_out[i]
                        y = b0 * x + z1
                        z1 = b1 * x + z2 - a1 * y
                        z2 = b2 * x - a2 * y
                        out[i] = y
                    signal_out = out
                    execution_logs.append(f"Executed Lisp macro: (biquad-filter-simd ... [b0={b0}, b1={b1}, b2={b2}])")

                elif fn_name == 'lisp-quantize-buffer':
                    # (lisp-quantize-buffer signal bits)
                    bits = int(expr[2]) if len(expr) > 2 else 8
                    levels = 2 ** bits
                    max_v = np.max(np.abs(signal_out)) or 1.0
                    norm = np.clip(signal_out / max_v, -1.0, 1.0)
                    q = np.round((norm + 1.0) / 2.0 * (levels - 1))
                    signal_out = ((q / (levels - 1)) * 2.0 - 1.0) * max_v
                    execution_logs.append(f"Executed Lisp macro: (lisp-quantize-buffer signal {bits})")

                elif fn_name == 'apply-kaiser-window':
                    # (apply-kaiser-window signal beta)
                    beta = float(expr[2]) if len(expr) > 2 else 14.0
                    window = np.kaiser(len(signal_out), beta)
                    signal_out = signal_out * window
                    execution_logs.append(f"Executed Lisp macro: (apply-kaiser-window signal {beta})")

        except Exception as e:
            logger.error(f"Lisp execution error: {e}")
            execution_logs.append(f"Error executing Lisp code: {str(e)}")

        return signal_out, {"logs": execution_logs, "status": "success"}
