"""
One-time script to fix the flake8 errors from the failed Lint Check run:
- F841 (unused 'response'/'res' variable in get_token() helpers)
- W391 (blank line at end of backend/urls.py)

Run from the project root:
    python fix_lint.py
"""

import re

# (file, line_number 1-indexed, old_prefix, new_prefix)
TARGETS = [
    ("ai_module/tests.py", 40),
    ("baggage/tests.py", 39),
    ("core_app/integration_tests.py", 30),
    ("core_app/tests.py", 38),
    ("flights/tests.py", 24),
    ("gates/tests.py", 36),
    ("ground_equipment/tests.py", 44),
    ("ground_equipment/tests.py", 117),
    ("ground_equipment/tests.py", 194),
    ("ground_equipment/tests.py", 264),
    ("hr_management/tests.py", 57),
    ("maintenance/tests.py", 31),
    ("notifications/tests.py", 21),
    ("reports/tests.py", 26),
    ("staff/tests.py", 29),
]


def fix_unused_assignment(path, line_no):
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    idx = line_no - 1
    original = lines[idx]
    # turns "        response = self.client.post(" into "        self.client.post("
    # or "    res = client.post('/api/token/'," into "    client.post('/api/token/',"
    new_line = re.sub(r"^(\s*)(?:response|res) = ", r"\1", original)

    if new_line == original:
        print(f"  SKIP (pattern not found): {path}:{line_no} -> {original!r}")
        return False

    lines[idx] = new_line
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.writelines(lines)
    print(f"  fixed: {path}:{line_no}")
    return True


def fix_trailing_blank_lines(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    fixed = content.rstrip("\n") + "\n"
    if fixed != content:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(fixed)
        print(f"  fixed trailing blank line(s): {path}")
    else:
        print(f"  SKIP (already clean): {path}")


if __name__ == "__main__":
    print("Fixing F841 unused variable warnings...")
    for file_path, line_no in TARGETS:
        fix_unused_assignment(file_path, line_no)

    print("\nFixing W391 blank line at end of file...")
    fix_trailing_blank_lines("backend/urls.py")

    print("\nFixing E127 continuation-line indent (caused by removing 'res = ')...")
    for path in ("core_app/integration_tests.py", "core_app/tests.py"):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        old = (
            "    client.post('/api/token/',\n"
            "                      {'username': username,\n"
            "                       'password': password},\n"
            "                      format='json')"
        )
        new = (
            "    client.post('/api/token/',\n"
            "                {'username': username,\n"
            "                 'password': password},\n"
            "                format='json')"
        )
        if old in content:
            content = content.replace(old, new)
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(content)
            print(f"  fixed: {path}")
        else:
            print(f"  SKIP (pattern not found): {path}")

    print("\nFixing E226 missing whitespace around arithmetic operator...")
    with open("ai_module/chatbot.py", "r", encoding="utf-8") as f:
        content = f.read()
    new_content = content.replace("confidence*100", "confidence * 100")
    if new_content != content:
        with open("ai_module/chatbot.py", "w", encoding="utf-8", newline="") as f:
            f.write(new_content)
        print("  fixed: ai_module/chatbot.py")

    seed_path = "digital_twin/management/commands/seed_congestion_demo.py"
    with open(seed_path, "r", encoding="utf-8") as f:
        content = f.read()
    new_content = content.replace("i+1", "i + 1")
    if new_content != content:
        with open(seed_path, "w", encoding="utf-8", newline="") as f:
            f.write(new_content)
        print(f"  fixed: {seed_path}")

    print("\nDone. Run the CI's exact flake8 command to confirm it's clean:")
    print(
        "  flake8 . --exclude=env,migrations,__pycache__,.git "
        "--max-line-length=120 --ignore=E501,W503,W504"
    )
