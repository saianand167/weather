import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import httpx

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Base exception for LLM assistant operations."""
    pass


class LLMConfigurationError(LLMError):
    """Raised when the LLM service is unconfigured or missing API credentials."""
    pass


class LLMTimeoutError(LLMError):
    """Raised when the LLM provider fails to respond within timeout window."""
    pass


class LLMProviderError(LLMError):
    """Raised when the external LLM provider returns an API error."""
    pass


class BaseLLMProvider(ABC):
    """Abstract interface for LLM providers."""

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 800
    ) -> str:
        """Generates a chat completion response from the configured LLM."""
        pass


class OpenAICompatibleProvider(BaseLLMProvider):
    """
    Production-ready OpenAI-compatible LLM provider.
    Compatible with OpenAI, Groq, Together, DeepSeek, Google Gemini OpenAI-compatible endpoints,
    and self-hosted Ollama / vLLM.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[int] = None
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.LLM_API_KEY
        self.base_url = (base_url or settings.LLM_BASE_URL).rstrip("/")
        self.model = model or settings.LLM_MODEL
        self.timeout_seconds = timeout_seconds or settings.LLM_TIMEOUT_SECONDS

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 800
    ) -> str:
        if not self.is_configured:
            raise LLMConfigurationError(
                "LLM API key is not configured. Please set LLM_API_KEY in your environment or .env file."
            )

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        url = f"{self.base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
                response = await client.post(url, json=payload, headers=headers)

                if response.status_code == 401:
                    logger.error("LLM Provider returned 401 Unauthorized.")
                    raise LLMProviderError("Authentication failed: Invalid or expired LLM API key.")
                elif response.status_code == 429:
                    logger.warning("LLM Provider returned 429 Rate Limit.")
                    raise LLMProviderError("LLM rate limit reached. Please retry in a few moments.")
                elif response.status_code >= 500:
                    logger.error(f"LLM Provider server error ({response.status_code}): {response.text}")
                    raise LLMProviderError(f"LLM provider error (status {response.status_code}).")
                elif response.status_code != 200:
                    logger.error(f"LLM Provider unexpected status {response.status_code}: {response.text}")
                    raise LLMProviderError(f"LLM request failed with status {response.status_code}.")

                data = response.json()
                choices = data.get("choices", [])
                if not choices:
                    raise LLMProviderError("LLM provider returned empty completion choices.")

                first_choice = choices[0]
                content = first_choice.get("message", {}).get("content", "")
                if not content:
                    raise LLMProviderError("LLM provider returned empty message content.")

                return content.strip()

        except httpx.TimeoutException as exc:
            logger.error(f"LLM request timed out after {self.timeout_seconds}s: {exc}")
            raise LLMTimeoutError(f"LLM provider timed out after {self.timeout_seconds} seconds.") from exc
        except httpx.RequestError as exc:
            logger.error(f"LLM network request failed: {exc}")
            raise LLMProviderError(f"Failed to communicate with LLM provider: {str(exc)}") from exc


def get_llm_provider() -> BaseLLMProvider:
    """Factory to retrieve configured LLM provider."""
    return OpenAICompatibleProvider()
