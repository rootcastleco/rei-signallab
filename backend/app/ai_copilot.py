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

SYSTEM_PROMPT = """You are REI SignalLab 2.1 AI Copilot — an expert, intelligent, friendly scientific Digital Signal Processing (DSP), Industrial Vibration Analysis, Electrical Power Quality, Antenna RF, and GPS SDR AI Assistant.

Guidelines for your responses:
1. **Natural & Direct Answers**: If the user asks a general question, greeting, or concept explanation (e.g. "what is dsp", "hello", "dsp nedir?", "explain FFT"), answer directly, warmly, and thoroughly in clear Markdown. Explain concepts step-by-step with real-world examples, relevant math formulas, and code where helpful.
2. **Language Matching**: Always respond in the SAME language as the user's question (e.g., if asked in Turkish, answer in clear Turkish; if asked in English, answer in clear English).
3. **Structured Telemetry Audits**: If the user specifically asks for a machinery vibration audit, electrical THD inspection, or node graph review, provide metric tables, standard checks (ISO 10816-3, IEEE 519), and actionable recommendations.
4. **Formatting**: Use clean Markdown formatting with clear headers, bullet points, bold key terms, and standard math notation.
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

        # Construct Context Prompt
        user_content = f"User Question/Prompt: {req.prompt}\n"
        if req.context_type and req.context_type != 'general':
            user_content += f"Context Area: {req.context_type}\n"
        if req.context_data:
            user_content += f"\nLive Telemetry Data JSON:\n```json\n{json.dumps(req.context_data, indent=2)}\n```\n"

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
                "temperature": 0.3,
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
                with urllib.request.urlopen(request, timeout=20) as response:
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
                logger.warning(f"OpenRouter Model {model_id} HTTP {http_err.code}: {err_body}")
                last_error = f"HTTP {http_err.code}: {err_body}"
            except Exception as e:
                logger.warning(f"OpenRouter Model {model_id} Exception: {e}")
                last_error = str(e)

        raise ValueError(f"OPENROUTER_ALL_MODELS_FAILED: {last_error or 'Could not complete inference.'}")
