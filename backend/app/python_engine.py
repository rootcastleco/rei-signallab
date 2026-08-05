import sys
import io
import traceback
import numpy as np
from scipy import signal as scipy_signal
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import base64
from typing import Dict, Any, Tuple

class PythonDSPEngine:
    """
    Python-based DSP Scripting, Simulation & Plotting Sandbox Engine.
    Executes user-defined Python scripts for custom signal processing experiments,
    captures stdout logs, Matplotlib plot figures, and computes signal metrics.
    """

    @staticmethod
    def execute_python_script(script_code: str) -> Dict[str, Any]:
        stdout_buffer = io.StringIO()
        old_stdout = sys.stdout
        plt.close('all')
        plt.figure(figsize=(9, 4), dpi=100)
        plt.style.use('dark_background')

        exec_globals = {
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
        metrics_dict = {}

        try:
            sys.stdout = stdout_buffer
            exec(script_code, exec_globals)
            sys.stdout = old_stdout
            console_out = stdout_buffer.getvalue()

            if console_out:
                for line in console_out.strip().splitlines():
                    logs.append(line)
            else:
                logs.append("Python DSP Script executed successfully.")

            # Capture Matplotlib figure if plotted
            fig = plt.gcf()
            if len(fig.axes) > 0:
                fig.patch.set_facecolor('#0D1117')
                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
                buf.seek(0)
                plot_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

            # Extract signal vectors if generated in script
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
            err_msg = traceback.format_exc()
            logs.append(f"Python Execution Error: {str(e)}")
            logs.append(err_msg)
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
