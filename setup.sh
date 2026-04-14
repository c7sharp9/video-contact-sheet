#!/usr/bin/env bash
# Per-Mac setup for the Video Contact Sheet tool.
#
# Idempotent — safe to re-run. Installs prerequisites, clones the tool repo
# and its publishing target, installs npm deps, and runs a smoke test.
#
# The one thing this script CANNOT automate is the macOS Shortcut itself
# (Shortcuts are signed files, no CLI to create them from a definition).
# The good news: once you build the Shortcut on ANY Mac, iCloud syncs it to
# every Mac signed into your Apple ID — you only build it once, ever.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/c7sharp9/video-contact-sheet/main/setup.sh | bash
#   # or clone + run locally:
#   cd ~/Code/video-contact-sheet && ./setup.sh

set -euo pipefail

CODE_DIR="$HOME/Code"
TOOL_DIR="$CODE_DIR/video-contact-sheet"
PUBLISH_DIR="$CODE_DIR/client-preview"
TOOL_REPO="https://github.com/c7sharp9/video-contact-sheet.git"
PUBLISH_REPO="https://github.com/c7sharp9/client-preview.git"

# ---- pretty output ----
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
step()   { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }

# ---- guards ----
if [[ "$(uname)" != "Darwin" ]]; then
  red "This setup script is macOS-only."
  exit 1
fi

# ---- 1. Homebrew ----
step "Checking Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  yellow "Homebrew not found. Installing…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Make brew available on this shell
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
else
  green "Homebrew present — $(brew --version | head -1)"
fi

# ---- 2. Dependencies ----
step "Installing dependencies (ffmpeg, node, gh)"
BREW_DEPS=(ffmpeg node gh)
for pkg in "${BREW_DEPS[@]}"; do
  if brew list --formula "$pkg" >/dev/null 2>&1; then
    green "  $pkg already installed"
  else
    yellow "  Installing $pkg…"
    brew install "$pkg"
  fi
done

# ---- 3. GitHub auth ----
step "Checking GitHub CLI auth"
if gh auth status >/dev/null 2>&1; then
  green "gh is authenticated ($(gh api user --jq .login 2>/dev/null || echo 'account detected'))"
else
  yellow "gh not logged in. Running: gh auth login"
  gh auth login
fi

# ---- 4. Clone the tool ----
step "Cloning video-contact-sheet"
mkdir -p "$CODE_DIR"
if [[ -d "$TOOL_DIR/.git" ]]; then
  green "  $TOOL_DIR already a git repo — pulling latest"
  git -C "$TOOL_DIR" pull --ff-only
else
  git clone "$TOOL_REPO" "$TOOL_DIR"
fi

# ---- 5. Clone the publishing target ----
step "Cloning client-preview (publishing target)"
if [[ -d "$PUBLISH_DIR/.git" ]]; then
  green "  $PUBLISH_DIR already a git repo — pulling latest"
  git -C "$PUBLISH_DIR" pull --ff-only
else
  git clone "$PUBLISH_REPO" "$PUBLISH_DIR"
fi

# ---- 6. npm install ----
step "Installing npm dependencies (for --pdf)"
cd "$TOOL_DIR"
npm install --silent

# ---- 7. Smoke test ----
step "Smoke test"
if command -v ffmpeg >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  green "  ffmpeg: $(ffmpeg -version | head -1 | awk '{print $3}')"
  green "  node:   $(node --version)"
  green "  git:    $(git --version | awk '{print $3}')"
  green "  gh:     $(gh --version | head -1 | awk '{print $3}')"
else
  red "  Missing tools after install — something went wrong."
  exit 1
fi

# ---- 8. Next-step guidance ----
cat <<EOF

$(bold "✓ Environment ready.")

$(bold "Last step — the macOS Shortcut:")

  If you have ALREADY built the Shortcut on another Mac, it should appear
  automatically here via iCloud sync within a minute or two. Nothing more
  to do. Test it with:

      Right-click any folder of videos in Finder → Quick Actions → Make Contact Sheet

  If this is your FIRST Mac (no Shortcut exists yet), follow the guide at:

      ~/Library/Mobile Documents/com~apple~CloudDocs/Projects/business/reframe/video-contact-sheet/docs/setup.html

  $(yellow "tl;dr:") Shortcuts.app → New → Run Shell Script → script body:
      cd ~/Code/video-contact-sheet && ./make-sheet
  → Enable "Use as Quick Action in Finder" → Save.

$(bold "You can also just run it from Terminal any time:")

      cd ~/Code/video-contact-sheet && ./make-sheet

EOF
