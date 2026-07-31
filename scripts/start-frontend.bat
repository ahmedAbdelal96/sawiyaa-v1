@echo off
title Sawiyaa Frontend

cd /d "%~dp0..\sawiyaa-frontend-v1"

echo Starting Sawiyaa Frontend...
call npm run dev

pause