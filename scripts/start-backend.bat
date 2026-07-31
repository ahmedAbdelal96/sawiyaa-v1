@echo off
title Sawiyaa Backend

cd /d "%~dp0..\sawiyaa-backend-v1"

echo Starting Sawiyaa Backend...
call npm run start:dev

pause