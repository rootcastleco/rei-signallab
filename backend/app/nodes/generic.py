import numpy as np
import ast
import math
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType

class SafeExpressionEvaluator:
    """
    Hardened AST-based Safe Expression Evaluator.
    Executes mathematical expressions without exec() or eval() vulnerabilities.
    """

    ALLOWED_NODES = {
        ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Name, ast.Constant,
        ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod, ast.USub, ast.UAdd
    }

    ALLOWED_FUNCTIONS = {
        "sin": np.sin, "cos": np.cos, "tan": np.tan,
        "sqrt": np.sqrt, "abs": np.abs, "exp": np.exp,
        "log": np.log, "log10": np.log10, "pi": np.pi
    }

    @classmethod
    def eval_expression(cls, expr_str: str, context_vars: Dict[str, Any]) -> Any:
        parsed = ast.parse(expr_str, mode="eval")

        for node in ast.walk(parsed):
            if type(node) not in cls.ALLOWED_NODES:
                raise ValueError(f"Security Error: Expression node '{type(node).__name__}' is forbidden.")

        return cls._eval_node(parsed.body, context_vars)

    @classmethod
    def _eval_node(cls, node, vars_dict: Dict[str, Any]) -> Any:
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.Name):
            if node.id in vars_dict:
                return vars_dict[node.id]
            elif node.id in cls.ALLOWED_FUNCTIONS:
                return cls.ALLOWED_FUNCTIONS[node.id]
            else:
                raise ValueError(f"Security Error: Variable/Function '{node.id}' is forbidden.")
        elif isinstance(node, ast.BinOp):
            left = cls._eval_node(node.left, vars_dict)
            right = cls._eval_node(node.right, vars_dict)
            if isinstance(node.op, ast.Add): return left + right
            elif isinstance(node.op, ast.Sub): return left - right
            elif isinstance(node.op, ast.Mult): return left * right
            elif isinstance(node.op, ast.Div): return left / right
            elif isinstance(node.op, ast.Pow): return left ** right
            elif isinstance(node.op, ast.Mod): return left % right
        elif isinstance(node, ast.UnaryOp):
            operand = cls._eval_node(node.operand, vars_dict)
            if isinstance(node.op, ast.USub): return -operand
            elif isinstance(node.op, ast.UAdd): return +operand
        elif isinstance(node, ast.Call):
            func = cls._eval_node(node.func, vars_dict)
            args = [cls._eval_node(arg, vars_dict) for arg in node.args]
            return func(*args)

        raise ValueError("Invalid AST Node")

class GenericRealValueFilterNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        x = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        t = np.linspace(0, len(x) / fs, len(x), endpoint=False)
        expr = self.params.get("expression", "x")

        ctx = {
            "x": x,
            "t": t,
            "sample_rate": fs,
            "pi": np.pi,
            "sin": np.sin, "cos": np.cos, "tan": np.tan,
            "sqrt": np.sqrt, "abs": np.abs, "exp": np.exp, "log": np.log
        }

        try:
            res = SafeExpressionEvaluator.eval_expression(expr, ctx)
            if np.isscalar(res):
                res = np.full_like(x, float(res))
        except Exception as e:
            raise ValueError(f"Expression evaluation error: {str(e)}")

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}
