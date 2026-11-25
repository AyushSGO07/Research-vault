#!/usr/bin/env bash
# =====================================================================
# ResearchVault - Unified Local Development Startup Script (macOS / Linux)
# =====================================================================

set -e

echo "===================================================================="
echo "Starting ResearchVault Development Environment..."
echo "===================================================================="

# Trap SIGINT/SIGTERM to stop child background processes cleanly
cleanup() {
    echo ""
    echo "Stopping ResearchVault services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Detect Python virtualenv
if [ -f "backend/.venv/bin/python" ]; then
    PYTHON_EXE="backend/.venv/bin/python"
elif [ -f ".venv/bin/python" ]; then
    PYTHON_EXE=".venv/bin/python"
else
    PYTHON_EXE="python3"
fi

echo "[1/3] Using Python: $PYTHON_EXE"

# 2. Initialize DB & Seed demo corpus
echo "[2/3] Initializing database and verifying demo corpus..."
$PYTHON_EXE backend/app/scripts/seed_corpus.py

# 3. Launch FastAPI backend
echo "[3/3] Starting FastAPI backend on http://localhost:8000 ..."
(cd backend && $PYTHON_EXE -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# 4. Launch Next.js frontend
echo "Starting Next.js frontend on http://localhost:3000 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "===================================================================="
echo "ResearchVault is running!"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/api/docs"
echo "Demo Login: demo@researchvault.edu / DemoPassword123!"
echo "Press Ctrl+C to terminate all services."
echo "===================================================================="

wait
