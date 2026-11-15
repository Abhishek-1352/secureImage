# SecureImage Startup Script for Windows PowerShell
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Starting SecureImage Hybrid Cryptographic System..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Initialize Backend
Write-Host "`n[1/3] Setting up Backend & Initializing Keys/Database..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
    .\venv\Scripts\pip install -r requirements.txt
}

.\venv\Scripts\python seed_admin.py

# 2. Start Backend in new process
Write-Host "`n[2/3] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000" -PassThru

# 3. Start Frontend in new process
Write-Host "`n[3/3] Launching React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
$frontendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -PassThru

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "SecureImage is running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:8000 (API Docs: http://localhost:8000/docs)" -ForegroundColor White
Write-Host "Demo Admin: admin@secureimage.local / Admin@123456" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
