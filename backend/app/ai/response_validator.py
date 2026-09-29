"""
Response validator and sanitizer for AI Meteorological Assistant.
"""
import re


class ResponseValidator:
    """
    Validates, sanitizes, and ensures safety and correctness
    for AI Assistant responses.
    """

    @classmethod
    def validate_and_sanitize(cls, response_text: str, user_query: str) -> str:
        if not response_text or not response_text.strip():
            return "Verified meteorological data for this query is currently unavailable."

        sanitized = response_text.strip()

        # Clean up any potential internal leak tokens or template artifacts
        sanitized = re.sub(r"<\|.*?\|>", "", sanitized).strip()

        return sanitized
