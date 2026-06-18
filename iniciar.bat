@echo off
echo Iniciando ProvaFacil...
echo.

start "Backend - ProvaFacil" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 3 /nobreak > nul
start "Frontend - ProvaFacil" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Servidores iniciados!
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
pause
