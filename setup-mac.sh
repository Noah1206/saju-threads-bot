#!/bin/bash
# One-shot Mac setup for saju-threads-bot.
#   cd <project folder> && bash setup-mac.sh
set -u
cd "$(dirname "$0")"

echo "=== 1/5 Homebrew ==="
if ! command -v brew >/dev/null; then
  echo "Homebrew not found. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
fi
echo "[OK] brew $(brew --version | head -1)"

echo "=== 2/5 Node 22 + Git ==="
command -v node >/dev/null || brew install node@22
command -v git  >/dev/null || brew install git
NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 22 ]; then echo "[X] node $(node -v) is too old (need >=22.9). brew install node@22"; exit 1; fi
echo "[OK] node $(node -v), $(git --version)"

echo "=== 3/5 Claude Code ==="
command -v claude >/dev/null || npm install -g @anthropic-ai/claude-code
echo "[OK] claude $(claude --version 2>/dev/null | head -1)"

echo "=== 4/5 Secrets ==="
MISSING=0
[ -f .env ] && echo "[OK] .env" || { echo "[X] .env missing -> cp .env.example .env and fill token (SETUP.md)"; MISSING=1; }
[ "$MISSING" = 1 ] && exit 1

echo "=== 5/5 API check ==="
npm run limit --silent 2>/dev/null | grep -q quota_total && echo "[OK] loverebbit token works" || echo "[X] token failed - check .env"

echo
echo "Done. Now run:  claude"
echo 'First message:  "CLAUDE.md 읽고 이어서. git status 먼저"'
