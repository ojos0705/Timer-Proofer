# Temporary extraction helper — run once, then can be deleted.
from pathlib import Path

html_path = Path(r"c:\xampp\htdocs\proofing-donat-baru\www\public\index.html")
js_dir = Path(r"c:\xampp\htdocs\proofing-donat-baru\www\public\assets\js")
text = html_path.read_text(encoding="utf-8")

core_start = text.find('<script type="module">\n/**\n * TIMER PROOFER')
core_end_marker = (
    "window.hapusFotoResep = hapusFotoResep;                   "
    "// dipanggil via onclick tombol × pada foto resep (di-generate dinamis lewat innerHTML)\n"
    "</script>"
)
core_end = text.find(core_end_marker)
if core_start < 0 or core_end < 0:
    raise SystemExit(f"app-core markers not found: start={core_start} end={core_end}")

core_open = text.find(">", core_start) + 1
core_js = text[core_open:core_end].lstrip("\n")
(js_dir / "app-core.js").write_text(core_js, encoding="utf-8")
print("wrote app-core.js", len(core_js), "chars")

gt_start = text.find('<script>\n        // =========================================================================\n// LETAKKAN ENGINE GOOGLE TRANSLATE')
gt_end = text.find(
    "</script>\n<!-- ==========================================\n     1. FULLSCREEN ONBOARDING SCREEN",
    gt_start,
)
if gt_start < 0 or gt_end < 0:
    raise SystemExit(f"language-engine markers not found: start={gt_start} end={gt_end}")

gt_open = text.find(">", gt_start) + 1
gt_js = text[gt_open:gt_end].lstrip("\n")
bridge = """
window.googleTranslateElementInit = googleTranslateElementInit;
window.filterDaftarBahasa = filterDaftarBahasa;
window.mulaiTransaksiMidtrans = mulaiTransaksiMidtrans;
"""
(js_dir / "language-engine.js").write_text(gt_js.rstrip() + "\n" + bridge, encoding="utf-8")
print("wrote language-engine.js", len(gt_js), "chars")

# Remove the two inline scripts from HTML
text = text[:core_start] + text[core_end + len(core_end_marker):]
# markers shifted; find again
gt_start = text.find('<script>\n        // =========================================================================\n// LETAKKAN ENGINE GOOGLE TRANSLATE')
gt_end = text.find(
    "</script>\n<!-- ==========================================\n     1. FULLSCREEN ONBOARDING SCREEN",
    gt_start,
)
text = text[:gt_start] + text[gt_end + len("</script>"):]

html_path.write_text(text, encoding="utf-8")
print("updated index.html, new length", len(text))
