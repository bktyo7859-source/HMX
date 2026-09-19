"""
HMX FastAPI Server Launcher
Runs the FastAPI valuation API on 127.0.0.1:8000
"""

import uvicorn

if __name__ == "__main__":
    print("Starting HMX Valuation API on http://127.0.0.1:8000...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
