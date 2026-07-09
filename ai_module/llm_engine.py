"""
Claude-backed chatbot engine. Sends the session's real conversation history
plus tool definitions (ai_tools.py) to the Anthropic API so the assistant
understands follow-ups and answers grounded in real app data.

Entry point: get_reply(message, user, session_id) -> str
Falls back to gemini_engine / the offline ChatbotEngine (see views.py) if
this raises for any reason.
"""
import requests
import json
from django.conf import settings

from .ai_tools import TOOLS, SYSTEM_PROMPT, fetch_history, run_tool

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
MAX_TOOL_ROUNDTRIPS = 4


def _call_claude(messages):
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    resp = requests.post(
        ANTHROPIC_API_URL,
        headers={
            "x-api-key": api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json"},
        json={
            "model": getattr(
                settings,
                "AI_CHAT_MODEL",
                "claude-sonnet-4-6"),
            "max_tokens": 1024,
            "system": SYSTEM_PROMPT,
            "messages": messages,
            "tools": TOOLS,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def get_reply(message, user=None, session_id=''):
    history = fetch_history(user, session_id)
    messages = [{"role": role, "content": content} for role,
                content in history] or [{"role": "user", "content": message}]

    for _ in range(MAX_TOOL_ROUNDTRIPS):
        content_blocks = _call_claude(messages).get("content", [])
        text = "\n".join(
            b["text"] for b in content_blocks if b.get("type") == "text").strip()
        tool_uses = [b for b in content_blocks if b.get("type") == "tool_use"]

        if not tool_uses:
            return text or "I couldn't come up with a response for that."

        messages.append({"role": "assistant", "content": content_blocks})
        messages.append({"role": "user", "content": [
            {"type": "tool_result", "tool_use_id": tu["id"],
             "content": json.dumps(run_tool(tu["name"], tu.get("input")), default=str)}
            for tu in tool_uses
        ]})

    return "I looked into that but couldn't finish the lookup in time - could you narrow the question down?"
