@echo off
cd /d %~dp0

start "API" cmd /k "cd backend && php artisan serve --host=127.0.0.1 --port=8000"
start "Reverb" cmd /k "cd backend && php artisan reverb:start --host=0.0.0.0 --port=8080"
start "Fila" cmd /k "cd backend && php artisan queue:work --tries=3 --sleep=1"
start "Vite" cmd /k "cd frontend && npm run dev"

timeout /t 5 >nul
start http://localhost:5173