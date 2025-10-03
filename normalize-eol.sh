#!/usr/bin/env bash
set -euo pipefail
branch="chore/normalize-eol"
git checkout -b "$branch" || git checkout "$branch"
cp -f .gitattributes . 2>/dev/null || true
cp -f .editorconfig . 2>/dev/null || true
git add .gitattributes .editorconfig
git add --renormalize .
git commit -m "chore: normalize line endings (.gitattributes, .editorconfig, renormalize)" || true
git push -u origin "$branch"
echo "Branch pushed: $branch"
