@echo off
echo ============================================
echo  FitTrack AI - Windows Setup Script
echo ============================================
echo.

echo [1/4] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+ from python.org
    pause
    exit /b 1
)

echo.
echo [2/4] Installing backend dependencies...
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python packages
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] Installing frontend dependencies...
cd frontend
npm install
if errorlevel 1 (
    echo ERROR: Failed to install npm packages. Make sure Node.js is installed.
    pause
    exit /b 1
)
cd ..

echo.
echo [4/4] Setup complete!
echo.
echo ============================================
echo  NEXT STEPS:
echo ============================================
echo  1. Create MySQL database:
echo     CREATE DATABASE fittrack;
echo.
echo  2. Update backend\.env with your DB credentials
echo.
echo  3. (Optional) Add your Gemini API key to .env
echo     Get it free at: https://makersuite.google.com
echo.
echo  4. Start the backend (new terminal):
echo     cd backend
echo     python -m uvicorn main:app --reload --host 127.0.0.1 --port 8080
echo.
echo  5. Start the frontend (another terminal):
echo     cd frontend
echo     npm start
echo.
echo  App will open at: http://localhost:3000
echo ============================================
pause
