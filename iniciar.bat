@echo off
cd /d "%~dp0"

:: Lança o Vite direto com Node (janela "node.exe", não "cmd.exe")
start "Ambientes — Servidor" node node_modules\vite\bin\vite.js dev

:: Pollar porta 8080 até o servidor responder
set /a i=0
:aguarda
set /a i+=1
if %i% gtr 60 ( echo Timeout. & pause & exit /b 1 )
powershell -NoProfile -Command "try{(New-Object Net.Sockets.TcpClient('localhost',8080)).Close();exit 0}catch{exit 1}" >nul 2>&1
if errorlevel 1 ( timeout /t 1 /nobreak >nul & goto aguarda )

start "" "http://localhost:8080"
exit