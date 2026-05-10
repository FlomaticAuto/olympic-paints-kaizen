@echo off
REM Kaizen Sync — runs daily at 07:30 via Task Scheduler.
REM Mines local Claude Code session logs, exports evidence JSON, syncs
REM agent memory files, and pushes to github.com/FlomaticAuto/olympic-paints-kaizen.
cd /d "C:\Users\quint\olympic-paints-kaizen"
python kaizen_sync.py
exit /b %ERRORLEVEL%
