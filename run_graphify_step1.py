import sys, os, subprocess
try:
    import graphify
    print("graphify installed")
except ImportError:
    print("graphify not installed, installing...")
    subprocess.run([sys.executable, "-m", "pip", "install", "graphifyy", "-q"], check=True)

os.makedirs("graphify-out", exist_ok=True)
with open("graphify-out/.graphify_python", "w", encoding="utf-8") as f:
    f.write(sys.executable)
with open("graphify-out/.graphify_root", "w", encoding="utf-8") as f:
    f.write(os.path.abspath("."))
print("Step 1 done")
