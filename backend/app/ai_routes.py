from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List

from app.ai_schemas import AICopilotRequest, AICopilotResponse, AIModelSpec
from app.ai_copilot import OpenRouterAIService, OPENROUTER_FREE_MODELS, get_default_openrouter_key

router = APIRouter(tags=["AI Copilot & OpenRouter Models"])

@router.get("/models", response_model=List[AIModelSpec])
def get_ai_models():
    """
    Returns available OpenRouter free models for DSP analysis and AI Copilot.
    """
    return OPENROUTER_FREE_MODELS

@router.post("/analyze", response_model=AICopilotResponse)
def analyze_with_ai(req: AICopilotRequest):
    """
    Executes real-time LLM analysis on signal telemetry, vibration metrics, power quality, or node graphs.
    """
    try:
        response = OpenRouterAIService.execute_analysis(req)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI_ANALYSIS_FAILED: {str(e)}")
