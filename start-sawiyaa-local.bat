@echo off
setlocal

set "PROJECT_ROOT=%~dp0"

start "Sawiyaa Backend" /D "%PROJECT_ROOT%sawiyaa-backend-v1" cmd /k "npm run start:dev"
start "Sawiyaa Frontend" /D "%PROJECT_ROOT%sawiyaa-frontend-v1" cmd /k "npm run dev"

echo Sawiyaa Backend and Frontend are starting in separate windows.
echo Backend: http://localhost:7000
echo Frontend: http://localhost:3000

endlocal
