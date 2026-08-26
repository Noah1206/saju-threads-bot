@echo off
REM One-shot laptop setup for saju-threads-bot. ASCII only (CP949 safe).
REM Run this from the project folder (double-click is fine).
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo === 1/5 Node.js ===
where node >nul 2>nul
if errorlevel 1 (
  echo Node not found. Installing via winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo Reopen this window after install and run again.
  pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo node %%v

echo === 2/5 Git ===
where git >nul 2>nul
if errorlevel 1 (
  echo Git not found. Installing via winget...
  winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
  echo Reopen this window after install and run again.
  pause & exit /b 1
)
for /f "tokens=*" %%v in ('git --version') do echo %%v

echo === 3/5 Claude Code ===
where claude >nul 2>nul
if errorlevel 1 (
  echo Claude Code not found. Installing via npm...
  call npm install -g @anthropic-ai/claude-code
)
for /f "tokens=*" %%v in ('claude --version 2^>nul') do echo claude %%v

echo === 4/5 Secrets ===
if not exist ".env" (
  echo [X] .env missing. Copy .env.example to .env and fill tokens. See SETUP.md
  set MISSING=1
) else ( echo [OK] .env )
if not exist ".env.loverebbit" (
  echo [X] .env.loverebbit missing. Copy .env.loverebbit.example and fill token.
  set MISSING=1
) else ( echo [OK] .env.loverebbit )
if defined MISSING ( pause & exit /b 1 )

echo === 5/5 API check ===
call npm run limit --silent 2>nul | findstr quota_total >nul && echo [OK] fitpick_00 token works || echo [X] fitpick_00 token failed
call npm run limit:lr --silent 2>nul | findstr quota_total >nul && echo [OK] loverebbit token works || echo [X] loverebbit token failed

echo.
echo Done. Now run:  claude
echo First message:  "CLAUDE.md read and continue. git status first."
pause
