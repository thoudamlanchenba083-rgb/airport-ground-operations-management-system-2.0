"""
Gemini-backed chatbot engine - same idea as llm_engine.py (Claude), but
speaking Google's Generative Language API. Shares tool definitions and
conversation-history fetching with llm_engine.py via ai_tools.py.

Entry point: get_reply(message, user, session_id) -> str
"""
import requests
from django.conf import settings

from .ai_tools import TOOLS, SYSTEM_PROMPT, fetch_history, run_tool

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MAX_TOOL_ROUNDTRIPS = 4

GEMINI_TOOLS = [{"function_declarations": [{"name": t["name"],
                                            "description": t["description"],
                                            "parameters": t["input_schema"]} for t in TOOLS]}]


def _call_gemini(contents):
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    model = getattr(settings, "GEMINI_CHAT_MODEL", "gemini-2.5-flash")
    resp = requests.post(GEMINI_API_URL.format(model=model),
                         params={"key": api_key},
                         json={"system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                               "contents": contents,
                               "tools": GEMINI_TOOLS},
                         timeout=30,
                         )
    resp.raise_for_status()
    return resp.json()


def get_reply(message, user=None, session_id=''):
    history = fetch_history(user, session_id)
    contents = [{"role": "model" if role == "assistant" else "user",
                 "parts": [{"text": content}]} for role,
                content in history] or [{"role": "user",
                                         "parts": [{"text": message}]}]

    for _ in range(MAX_TOOL_ROUNDTRIPS):
        candidates = _call_gemini(contents).get("candidates") or []
        if not candidates:
            return "I couldn't come up with a response for that."

        parts = candidates[0].get("content", {}).get("parts", [])
        text = "\n".join(p["text"] for p in parts if "text" in p).strip()
        calls = [p["functionCall"] for p in parts if "functionCall" in p]

        if not calls:
            return text or "I couldn't come up with a response for that."

        contents.append({"role": "model", "parts": parts})
        contents.append({"role": "user",
                         "parts": [{"functionResponse": {"name": fc["name"],
                                    "response": {"result": run_tool(fc["name"],
                                                                    fc.get("args"))}}} for fc in calls]})

    return "I looked into that but couldn't finish the lookup in time - could you narrow the question down?"
