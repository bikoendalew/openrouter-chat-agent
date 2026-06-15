"""
Run this once (or whenever you change frontend code):
    python start.py

It will:
  1. Build the Next.js frontend into ../frontend/out/
  2. Start FastAPI on http://localhost:8000  (serves both API + UI)
"""

import os
import sys
import subprocess
import uvicorn

BASE = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE, "..", "frontend")
FRONTEND_OUT = os.path.join(FRONTEND_DIR, "out")


def build_frontend():
    print("\n>>> Building frontend (Next.js static export)...\n")

    # Install node_modules if missing
    if not os.path.isdir(os.path.join(FRONTEND_DIR, "node_modules")):
        print(">>> node_modules not found — running npm install first...\n")
        result = subprocess.run(
            ["npm", "install"],
            cwd=FRONTEND_DIR,
            shell=True,
        )
        if result.returncode != 0:
            print("\n[ERROR] npm install failed. Make sure Node.js is installed.")
            sys.exit(1)

    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=FRONTEND_DIR,
        shell=True,
    )
    if result.returncode != 0:
        print("\n[ERROR] Frontend build failed.")
        sys.exit(1)

    print("\n>>> Frontend built successfully.\n")


if __name__ == "__main__":
    # Skip rebuild if --no-build flag passed (faster restarts during dev)
    if "--no-build" not in sys.argv:
        build_frontend()
    else:
        if not os.path.isdir(FRONTEND_OUT):
            print("[WARNING] --no-build passed but frontend/out/ does not exist — building anyway.")
            build_frontend()

    print(">>> Starting BEagent on http://localhost:8000\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
