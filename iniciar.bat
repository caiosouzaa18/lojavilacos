@echo off
title 🚀 Iniciando Sistema Loja

echo ================================
echo Iniciando Backend...
echo ================================

cd server
start cmd /k node server.js

timeout /t 2 >nul

echo ================================
echo Iniciando Frontend...
echo ================================

cd ../client
start cmd /k npm start

echo ================================
echo Sistema iniciado!
echo ================================

pause