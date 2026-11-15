@echo off
echo ==================================================
echo Starting SecureImage Hybrid Cryptographic System...
echo ==================================================

cd /d "%~dp0backend"
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    call .\venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call .\venv\Scripts\activate.bat
)

echo Initializing database and RSA keys...
python seed_admin.py

echo Starting FastAPI Backend server...
start "SecureImage Backend" cmd /k ".\venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000"

cd /d "%~dp0frontend"
echo Starting Frontend React Vite server...
start "SecureImage Frontend" cmd /k "npm run dev"

echo.
echo ==================================================
echo SecureImage is running!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)
echo Demo Admin: admin@secureimage.local / Admin@123456
echo ==================================================
