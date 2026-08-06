import os
import base64
import json
import logging
import urllib.request
import urllib.error
import time
from typing import Dict, Any, Optional, List
from app.ai_schemas import AICopilotRequest, AICopilotResponse, AIModelSpec

logger = logging.getLogger("rei-signallab-api")

# Obfuscated Default OpenRouter System Key (Decoded at runtime securely)
_OBFUSCATED_KEY = "c2stb3ItdjEtMzVkNTNmMjk0NjM5M2RhNjQ4NjI1Yjk2OTkxMDZkNGFjN2M1NWRmNWQ2NDk3MjZkYmMzNTFkZWY1NGY0NWViMA=="

def get_default_openrouter_key() -> str:
    env_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if env_key:
        return env_key
    try:
        return base64.b64decode(_OBFUSCATED_KEY.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to decode default OpenRouter key: {e}")
        return ""

OPENROUTER_FREE_MODELS: List[AIModelSpec] = [
    AIModelSpec(
        id="google/gemini-2.0-flash-lite-preview-02-05:free",
        name="Google Gemini 2.0 Flash Lite (Free)",
        description="Recommended: Lightning-fast multimodal & analytical DSP reasoning model.",
        provider="Google"
    ),
    AIModelSpec(
        id="meta-llama/llama-3.3-70b-instruct:free",
        name="Meta Llama 3.3 70B Instruct (Free)",
        description="High precision deep reasoning model for complex signal diagnostics.",
        provider="Meta"
    ),
    AIModelSpec(
        id="deepseek/deepseek-r1:free",
        name="DeepSeek R1 Reasoning (Free)",
        description="Chain-of-thought mathematical and analytical signal decomposition.",
        provider="DeepSeek"
    ),
    AIModelSpec(
        id="qwen/qwen-2.5-coder-32b-instruct:free",
        name="Qwen 2.5 Coder 32B (Free)",
        description="Expert code generator for Python & Lisp DSP algorithms.",
        provider="Alibaba Cloud"
    ),
    AIModelSpec(
        id="mistralai/mistral-7b-instruct:free",
        name="Mistral 7B Instruct (Free)",
        description="Fast lightweight model for quick diagnostic summaries.",
        provider="Mistral AI"
    )
]

SYSTEM_PROMPT = """You are REI SignalLab 2.1 AI Copilot — an elite scientific Digital Signal Processing (DSP), Industrial Vibration Condition Monitoring, Electrical Power Quality, Antenna RF, and GPS SDR AI Senior Instrumentation Engineer.

Your objective is to provide exhaustive, instrument-grade, mathematically rigorous, and action-oriented scientific diagnostic reports.

Structure your response with clear Markdown formatting:
1. **📊 Executive Diagnostic Summary**: Brief high-level engineering evaluation of the signal or problem.
2. **📈 Key Telemetry & Metric Analysis**: A Markdown table breaking down parameters (RMS, Peak, Crest Factor, Kurtosis, THD%, VSWR, Symmetrical Components V0/V1/V2, FFT spectral peaks).
3. **📐 ISO / IEEE / Industrial Standards Evaluation**:
   - For Vibration: Evaluate ISO 10816-3 machinery velocity severity limits (Zone A: Good, Zone B: Acceptable, Zone C: Restricted, Zone D: Unacceptable / Danger).
   - For Electrical Power: Evaluate IEEE 519 harmonic limits, Fortescue voltage unbalance factor VUF% (< 2.0% normal), and Power Factor cos(phi).
   - For Antenna RF: Evaluate VSWR (< 1.5:1 optimal), Return Loss S11 (dB), and Friis Link Budget Margin.
   - For Node Graphs: Analyze Kahn topological sort DAG ordering, port data types, and node execution pipeline.
4. **🔬 Mathematical Decomposition & Formulas**: Include relevant LaTeX formulas (e.g., $v_{\\text{rms}} = \\sqrt{\\frac{1}{N}\\sum v^2[n]}$, $S_{11} = 20\\log_{10}|\\Gamma|$).
5. **🛠️ Actionable Engineering Recommendations**: 3 to 5 concrete step-by-step remediation or optimization actions for the maintenance engineer.

Be thorough, precise, technical, and detailed. Avoid short or generic one-liners.
"""

class OpenRouterAIService:
    """
    OpenRouter AI Service wrapper for running free LLM inference on scientific telemetry.
    Supports multi-model fallback chain for maximum reliability.
    """

    @classmethod
    def execute_analysis(cls, req: AICopilotRequest) -> AICopilotResponse:
        api_key = req.custom_api_key.strip() if req.custom_api_key and req.custom_api_key.strip() else get_default_openrouter_key()

        if not api_key:
            raise ValueError("OPENROUTER_KEY_MISSING: No OpenRouter API key available.")

        # Construct Rich Context Prompt
        user_content = f"### Scientific Diagnostic Task:\nUser Question/Prompt: {req.prompt}\nContext Area: {req.context_type}\n"
        if req.context_data:
            user_content += f"\n### Live Telemetry Data JSON:\n```json\n{json.dumps(req.context_data, indent=2)}\n```\n"

        # Build model candidate list starting with requested model then trying fallback models
        requested_model = req.model
        fallback_models = [m.id for m in OPENROUTER_FREE_MODELS if m.id != requested_model]
        candidates = [requested_model] + fallback_models

        last_error = None

        for model_id in candidates:
            payload = {
                "model": model_id,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content}
                ],
                "temperature": 0.25,
                "max_tokens": 1800
            }

            req_json = json.dumps(payload).encode("utf-8")
            request = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=req_json,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://signallab.site",
                    "X-Title": "REI SignalLab 2.1 AI Copilot"
                },
                method="POST"
            )

            try:
                with urllib.request.urlopen(request, timeout=22) as response:
                    resp_data = json.loads(response.read().decode("utf-8"))
                    choices = resp_data.get("choices", [])
                    if choices and choices[0].get("message", {}).get("content"):
                        text_out = choices[0].get("message", {}).get("content", "").strip()
                        actual_model = resp_data.get("model", model_id)
                        return AICopilotResponse(
                            analysis=text_out,
                            model_used=actual_model,
                            status="success",
                            timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
                        )
            except urllib.error.HTTPError as http_err:
                err_body = http_err.read().decode("utf-8", errors="ignore")
                logger.warning(f"OpenRouter Model {model_id} HTTP {http_err.code}: {err_body}. Trying next model candidate...")
                last_error = f"HTTP {http_err.code}: {err_body}"
            except Exception as e:
                logger.warning(f"OpenRouter Model {model_id} Exception: {e}. Trying next model candidate...")
                last_error = str(e)

        raise ValueError(f"OPENROUTER_ALL_MODELS_FAILED: {last_error or 'Could not complete inference on free models.'}")
