old = """        for provider in providers:
            try:
                return provider(message, user=user, session_id=session_id)
            except Exception:
                continue  # try the next provider, or fall through to offline"""

new = """        for provider in providers:
            try:
                return provider(message, user=user, session_id=session_id)
            except Exception as e:
                print(f"[AI DEBUG] {provider.__module__} failed: {e}")
                continue  # try the next provider, or fall through to offline"""

path = "ai_module/views.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if old not in content:
    print("PATTERN NOT FOUND - no changes made")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("PATCHED SUCCESSFULLY")
