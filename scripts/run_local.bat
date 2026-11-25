@echo off
REM =====================================================================
REM ResearchVault - Unified Local Development Startup Script (Windows)
REM =====================================================================

echo ====================================================================
echo Starting ResearchVault Development Environment...
echo ====================================================================

REM 1. Check Python Virtual Environment
IF EXIST "D:\Machine_Learning\.venv\Scripts\python.exe" (
    SET "PYTHON_EXE=D:\Machine_Learning\.venv\Scripts\python.exe"
) ELSE IF EXIST "backend\.venv\Scripts\python.exe" (
    SET "PYTHON_EXE=backend\.venv\Scripts\python.exe"
) ELSE (
    SET "PYTHON_EXE=python"
)

echo [1/3] Using Python: %PYTHON_EXE%

REM 2. Run Database Migrations & Initial Corpus Seeder
echo [2/3] Checking demo corpus and initializing database...
"%PYTHON_EXE%" backend\app\scripts\seed_corpus.py

REM 3. Launch Backend in new window
echo [3/3] Launching FastAPI backend on http://localhost:8000 ...
start "ResearchVault Backend (FastAPI)" cmd /k "cd backend && "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM 4. Launch Frontend in new window
echo Launching Next.js frontend on http://localhost:3000 ...
start "ResearchVault Frontend (Next.js)" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================================
echo ResearchVault is starting!
echo Frontend: http://localhost:3000
echo Backend API & Docs: http://localhost:8000/api/docs
echo Demo Login: demo@researchvault.edu / DemoPassword123!
echo ====================================================================
