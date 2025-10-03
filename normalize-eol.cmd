@echo off
setlocal enabledelayedexpansion
set BRANCH=chore/normalize-eol
git checkout -b %BRANCH% || git checkout %BRANCH%
copy /Y .gitattributes . >nul 2>&1
copy /Y .editorconfig . >nul 2>&1
git add .gitattributes .editorconfig
git add --renormalize .
git commit -m "chore: normalize line endings (.gitattributes, .editorconfig, renormalize)"
git push -u origin %BRANCH%
echo Branch pushed: %BRANCH%
