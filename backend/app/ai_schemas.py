from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class AIModelSpec(BaseModel):
    id: str
    name: str
    description: str
    provider: str
    is_free: bool = True

class AICopilotRequest(BaseModel):
    prompt: str = Field(..., description="User prompt or DSP diagnostic question")
    context_type: str = Field("general", description="Context area: vibration, electrical, antenna, gps, graph, python, general")
    context_data: Optional[Dict[str, Any]] = Field(default=None, description="Signal telemetry, metrics, spectrum or node graph state")
    model: str = Field("google/gemini-2.0-flash-lite-preview-02-05:free", description="Target OpenRouter free model ID")
    custom_api_key: Optional[str] = Field(default=None, description="Optional custom user OpenRouter API key")

class AICopilotResponse(BaseModel):
    analysis: str = Field(..., description="AI generated diagnostic report or DSP answer")
    model_used: str
    status: str = "success"
    timestamp: str
