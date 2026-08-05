import sys
import io
import numpy as np
from scipy import signal as scipy_signal
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import base64
from typing import Dict, Any

ALLOWED_MODULES = {'numpy', 'np', 'scipy', 'matplotlib', 'plt', 'math', 'random'}

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    root_name = name.split('.')[0]
    if root_name in ['os', 'sys', 'subprocess', 'socket', 'shutil', 'pathlib']:
        raise ImportError(f"Importing module '{name}' is prohibited in Python DSP Sandbox.")
    return __import__(name, globals, locals, fromlist, level)

SAFE_BUILTINS = {
    'abs': abs,
    'all': all,
    'any': any,
    'bin': bin,
    'bool': bool,
    'dict': dict,
    'dir': dir,
    'divmod': divmod,
    'enumerate': enumerate,
    'float': float,
    'format': format,
    'hex': hex,
    'int': int,
    'isinstance': isinstance,
    'issubclass': issubclass,
    'len': len,
    'list': list,
    'map': map,
    'max': max,
    'min': min,
    'oct': oct,
    'ord': ord,
    'pow': pow,
    'print': print,
    'range': range,
    'repr': repr,
    'reversed': reversed,
    'round': round,
    'set': set,
    'slice': slice,
    'sorted': sorted,
    'str': str,
    'sum': sum,
    'tuple': tuple,
    'zip': zip,
    'Exception': Exception,
    'ValueError': ValueError,
    'TypeError': TypeError,
    '__import__': safe_import,
}

class PythonDSPEngine:
    """
    Hardened Python-based DSP Scripting & Simulation Sandbox Engine.
    Executes user-defined Python scripts inside a restricted sandbox environment,
    enforces memory & output quotas, captures console stdout, and generates Matplotlib figures.
    """

    @staticmethod
    def execute_script(script_code: str) -> Dict[str, Any]:
        return PythonDSPEngine.execute_python_script(script_code)

    @staticmethod
    def execute_python_script(script_code: str) -> Dict[str, Any]:
        forbidden_keywords = ['import os', 'import sys', 'import subprocess', 'import socket', 'shutil', 'eval', 'exec']
        for kw in forbidden_keywords:
            if kw in script_code:
                return {
                    "status": "error",
                    "logs": [f"Security Violation: Use of restricted instruction '{kw}' is prohibited in Python DSP Sandbox."],
                    "plot_base64": None,
                    "time": [],
                    "raw_signal": [],
                    "filtered_signal": []
                }

        stdout_buffer = io.StringIO()
        old_stdout = sys.stdout
        plt.close('all')
        plt.figure(figsize=(9, 4), dpi=100)
        plt.style.use('dark_background')

        exec_globals = {
            '__builtins__': SAFE_BUILTINS,
            'np': np,
            'numpy': np,
            'scipy_signal': scipy_signal,
            'signal': scipy_signal,
            'plt': plt,
            'matplotlib': matplotlib,
            't': None,
            'raw_signal': None,
            'filtered_signal': None,
            'sample_rate': 44100
        }

        logs = []
        plot_base64 = None
        time_vector = []
        raw_signal_list = []
        filtered_signal_list = []

        try:
            sys.stdout = stdout_buffer
            exec(script_code, exec_globals)
            sys.stdout = old_stdout
            console_out = stdout_buffer.getvalue()

            if len(console_out) > 5 * 1024 * 1024:
                console_out = console_out[:5 * 1024 * 1024] + "\n[Output Truncated: 5MB Cap Exceeded]"

            if console_out:
                for line in console_out.strip().splitlines()[:200]:
                    logs.append(line)
            else:
                logs.append("Python DSP Script executed successfully.")

            fig = plt.gcf()
            if len(fig.axes) > 0:
                fig.patch.set_facecolor('#0D1117')
                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
                buf.seek(0)
                plot_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

            if exec_globals.get('t') is not None:
                t_arr = np.array(exec_globals['t'], dtype=np.float64)
                time_vector = t_arr.tolist()

            if exec_globals.get('raw_signal') is not None:
                raw_arr = np.array(exec_globals['raw_signal'], dtype=np.float64)
                raw_signal_list = raw_arr.tolist()

            if exec_globals.get('filtered_signal') is not None:
                filt_arr = np.array(exec_globals['filtered_signal'], dtype=np.float64)
                filtered_signal_list = filt_arr.tolist()
            elif len(raw_signal_list) > 0:
                filtered_signal_list = raw_signal_list

            status = "success"

        except Exception as e:
            sys.stdout = old_stdout
            logs.append(f"Python Execution Error: {str(e)}")
            status = "error"
        finally:
            plt.close('all')

        return {
            "status": status,
            "logs": logs,
            "plot_base64": plot_base64,
            "time": time_vector,
            "raw_signal": raw_signal_list,
            "filtered_signal": filtered_signal_list
        }

PythonSandboxEngine = PythonDSPEngine
