@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:4173 after the server starts.
echo Keep this window open. Press Ctrl+C to stop.
node server.mjs
pause
