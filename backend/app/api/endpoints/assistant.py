from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.config.settings import get_settings
from app.schemas.assistant import ChatRequest, ChatResponse, AssistantStatusResponse
from app.ai.assistant import AIAssistantService
from app.ai.provider import get_llm_provider

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Context-aware AI Meteorological Assistant for SIH26080.
    Understands selected district, live NWP conditions, regime classification,
    bias correction results, verification scores, and canonical benchmark events.
    """
    history_dicts = [
        {"role": msg.role, "content": msg.content} for msg in (request.history or [])
    ]

    result = await AIAssistantService.chat(
        user_message=request.message,
        db=db,
        district=request.district,
        state=request.state,
        lat=request.lat,
        lon=request.lon,
        history=history_dicts,
        live_params={
            "rainfall": request.rainfall,
            "temperature": request.temperature,
            "humidity": request.humidity,
            "pressure": request.pressure,
            "wind_speed": request.wind_speed,
            "wind_direction": request.wind_direction,
            "weather_description": request.weather_description
        }
    )

    return ChatResponse(**result)


@router.get("/status", response_model=AssistantStatusResponse)
def get_assistant_status():
    """Returns the operational status of the AI Assistant integration."""
    settings = get_settings()
    provider = get_llm_provider()
    configured = bool(settings.LLM_API_KEY and settings.LLM_API_KEY.strip())

    return AssistantStatusResponse(
        configured=configured,
        provider=settings.LLM_PROVIDER,
        model=settings.LLM_MODEL,
        status="operational" if configured else "local_context_mode",
        message=(
            "AI Assistant operational with live LLM provider."
            if configured
            else "AI Assistant operating in local verified context mode. To enable conversational LLM generation, set LLM_API_KEY in .env."
        )
    )


@router.post("/clear")
def clear_conversation():
    """Resets conversational session context."""
    return {"status": "cleared", "message": "Conversation context reset."}
