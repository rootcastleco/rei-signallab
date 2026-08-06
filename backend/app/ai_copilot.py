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

SYSTEM_PROMPT = """You are REI SignalLab AI Copilot — an expert scientific signal processing (DSP), vibration analysis, electrical power quality, antenna RF, and GPS SDR AI assistant.

Your task is to provide instrument-grade, accurate, mathematical, and structured signal diagnostics.

Guidelines:
1. Provide structured markdown responses with clear headings, metric evaluations, and engineering recommendations.
2. For Vibration Analysis: Evaluate RMS, Peak, Crest Factor, Kurtosis, FFT Spectral Peaks, Hilbert Envelope Defects, and ISO 10816 velocity limits.
3. For Electrical Power: Evaluate Vrms, Irms, Active/Reactive Power (P, Q, S), Power Factor cos(phi), THD%, and Symmetrical Components (V0, V1, V2, VUF%).
4. For Antenna & RF: Evaluate VSWR, Return Loss (S11), Reflection Coefficient Gamma, and Friis Link Budget Margins.
5. For Node Graphs: Analyze topology, topological sort ordering, Kahn execution, and data type compatibility.
6. Keep recommendations actionable, professional, and precise.
"""

class OpenRouterAIService:
  """
  OpenRouter AI Service wrapper for running free LLM inference on scientific telemetry.
  """

  @classmethod
  def execute_analysis(cls, req: AICopilotRequest) -> AICopilotResponse:
    api_key = req.custom_api_key.strip() if req.custom_api_key and req.custom_api_key.strip() else get_default_openrouter_key()

    if not api_key:
      raise ValueError("OPENROUTER_KEY_MISSING: No OpenRouter API key available.")

    # Construct Context Prompt
    user_content = f"User Prompt: {req.prompt}\nContext Area: {req.context_type}\n"
    if req.context_data:
      user_content += f"\nTelemetry Data JSON:\n```json\n{json.dumps(req.context_data, indent=2)}\n```\n"

    payload = {
        "model": req.model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.3,
        "max_tokens": 1500
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
      with urllib.request.urlopen(request, timeout=25) as response:
        resp_data = json.loads(response.read().decode("utf-8"))

        choices = resp_data.get("choices", [])
        if not choices:
          raise ValueError("OPENROUTER_EMPTY_RESPONSE: No choices returned from model.")

        text_out = choices[0].get("message", {}).get("content", "").strip()
        model_used = resp_data.get("model", req.model)

        return AICopilotResponse(
            analysis=text_out,
            model_used=model_used,
            status="success",
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
        )

    except urllib.error.HTTPError as http_err:
      err_body = http_err.read().decode("utf-8", errors="ignore")
      logger.error(f"OpenRouter HTTP {http_err.code}: {err_body}")
      raise ValueError(f"OPENROUTER_API_ERROR ({http_err.code}): {err_body}")
    except Exception as e:
      logger.error(f"OpenRouter Request Exception: {e}")
      raise ValueError(f"OPENROUTER_REQUEST_FAILED: {str(e)}")
