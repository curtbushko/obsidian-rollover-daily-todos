#!/usr/bin/env bash
#
# build-and-sync.sh - Build the plugin and sync to kb directory
#
# This script builds both the Obsidian plugin and CLI, then copies
# the built files to the kb vault

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KB_PLUGIN_DIR="$HOME/workspace/github.com/curtbushko/kb/.obsidian/plugins/obsidian-rollover-daily-todos"

echo "Building plugin and CLI..."
cd "$SCRIPT_DIR"
npm run build:all

echo "Copying files to kb..."
mkdir -p "$KB_PLUGIN_DIR"
cp main.js "$KB_PLUGIN_DIR/"
cp cli.mjs "$KB_PLUGIN_DIR/"
cp manifest.json "$KB_PLUGIN_DIR/"
chmod +x "$KB_PLUGIN_DIR/cli.mjs"

echo "Done! Plugin updated in kb vault."
echo "You can now run: ~/workspace/github.com/curtbushko/kb/scripts/rollover-todos.sh"
