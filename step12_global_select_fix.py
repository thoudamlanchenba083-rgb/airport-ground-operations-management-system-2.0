path = "frontend/src/index.css"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

addition = """
/* ---------- Native <select>/<option> fix (applies to every page) ----------
   color-scheme alone isn't reliably honored by every browser for the
   dropdown *popup* list, only for the closed control. Components across
   the app use translucent Tailwind backgrounds (bg-white/5 etc.) which
   look fine on the closed select but leave the native popup list to fall
   back to the browser default (white-on-black text), which looks broken
   in dark mode. Forcing solid, explicit colors here fixes every select
   and option in the app in one place, regardless of what utility classes
   an individual component uses. */
select, option {
  background-color: #ffffff;
  color: #0f172a;
}

.dark select,
.dark option {
  background-color: #262626;
  color: #f5f5f5;
}
"""

if "Native <select>/<option> fix" not in content:
    content = content.rstrip("\n") + "\n" + addition
    print("Global select/option fix appended.")
else:
    print("Fix already present, skipping.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. index.css updated.")
