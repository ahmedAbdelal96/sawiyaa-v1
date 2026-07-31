@echo off
title Sawiyaa Mobile Web

cd /d "%~dp0..\sawiyaa-mobile"

echo Starting Sawiyaa Mobile Web...
call npm run web

pause