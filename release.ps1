<#
.SYNOPSIS
  Release helper for telegram-game-bot on Windows PowerShell.

.DESCRIPTION
  Automates the canonical flow:
    - sync base branch (default: main)
    - compute next version (or use -Version)
    - create release branch "release/<version>"
    - (optional) npm ci/typecheck/build
    - bump version with `npm version <version>` (creates commit + tag v<version>)
    - push branch with tags
    - (optional) open PR via GitHub CLI
    - (optional) create GitHub Release with notes

.PARAMETER Bump
  One of: patch | minor | major. Ignored if -Version is provided.

.PARAMETER Version
  Explicit version to release (e.g., 0.0.26). If provided, supersedes -Bump.

.PARAMETER BaseBranch
  The protected branch to branch off from (default: main).

.PARAMETER Push
  Push the branch and tags to origin.

.PARAMETER CreatePR
  Create a Pull Request via GitHub CLI (gh).

.PARAMETER CreateRelease
  Create a GitHub Release (tag must exist/pushed).

.PARAMETER NoBuild
  Skip npm ci/typecheck/build (use if already built).

.PARAMETER DryRun
  Print planned actions but do not modify git/npm state.

.EXAMPLE
  .\release.ps1 -Bump patch -Push -CreatePR

.EXAMPLE
  .\release.ps1 -Version 0.0.26 -Push -CreatePR -CreateRelease

#>
[CmdletBinding()]
param(
  [ValidateSet('patch','minor','major')]
  [string]$Bump = 'patch',

  [string]$Version,

  [string]$BaseBranch = 'main',

  [switch]$Push,
  [switch]$CreatePR,
  [switch]$CreateRelease,

  [switch]$NoBuild,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Assert-Cli {
  param([string]$Name, [string]$Hint)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required tool '$Name' is not available. $Hint"
  }
}

function Get-PackageJson {
  $pkgPath = Join-Path (Get-Location) 'package.json'
  if (-not (Test-Path $pkgPath)) { throw "package.json not found in $(Get-Location)" }
  try {
    return Get-Content $pkgPath -Raw | ConvertFrom-Json -Depth 10
  } catch {
    throw "Failed to parse package.json: $($_.Exception.Message)"
  }
}

function Get-NextVersion {
  param(
    [string]$Current,
    [ValidateSet('patch','minor','major')]
    [string]$BumpKind
  )
  if ($Current -notmatch '^\d+\.\d+\.\d+$') {
    throw "Current version '$Current' is not plain semver (x.y.z). Provide -Version explicitly."
  }
  $parts = $Current.Split('.')
  $maj = [int]$parts[0]; $min = [int]$parts[1]; $pat = [int]$parts[2]
  switch ($BumpKind) {
    'major' { $maj++; $min = 0; $pat = 0 }
    'minor' { $min++; $pat = 0 }
    'patch' { $pat++ }
  }
  return "{0}.{1}.{2}" -f $maj,$min,$pat
}

function Assert-CleanTree {
  # returns $false if not clean (so we can print a nice error)
  $isClean = $true
  $status = (git status --porcelain)
  if ($LASTEXITCODE -ne 0) { throw "git status failed" }
  if ($status) { $isClean = $false }
  return $isClean
}

function Run {
  param([string]$Cmd)
  Write-Host ">> $Cmd" -ForegroundColor Cyan
  if (-not $DryRun) {
    Invoke-Expression $Cmd
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed (exit $LASTEXITCODE): $Cmd"
    }
  }
}

# --- Preconditions ---
Assert-Cli git "Install Git for Windows."
Assert-Cli npm "Install Node.js (which includes npm)."
if ($CreatePR -or $CreateRelease) { Assert-Cli gh "Install GitHub CLI (gh)." }

# --- Validate git state ---
if (-not (Assert-CleanTree)) {
  throw "Git working tree is not clean. Commit or stash your changes first."
}

# --- Ensure base branch is up to date ---
Run "git checkout $BaseBranch"
Run "git pull origin $BaseBranch"

# --- Determine version ---
$pkg = Get-PackageJson
$current = "$($pkg.version)"
if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = Get-NextVersion -Current $current -BumpKind $Bump
  Write-Host "Calculated next version from package.json ($current) + $Bump => $Version" -ForegroundColor Yellow
} else {
  Write-Host "Using explicit version: $Version" -ForegroundColor Yellow
}

# --- Create release branch ---
$relBranch = "release/$Version"
# if branch exists locally or remotely, reuse it
$existsLocal = (git branch --list $relBranch)
$existsRemote = (git ls-remote --heads origin $relBranch)
if ($existsLocal) {
  Run "git checkout $relBranch"
} elseif ($existsRemote) {
  Run "git fetch origin $relBranch:$relBranch"
  Run "git checkout $relBranch"
} else {
  Run "git checkout -b $relBranch"
}

# --- Build / typecheck (optional) ---
if (-not $NoBuild) {
  Run "npm ci"
  Run "npm run typecheck"
  Run "npm run build"
} else {
  Write-Host "Skipping build/typecheck as requested (-NoBuild)" -ForegroundColor DarkYellow
}

# --- Bump version and create tag ---
# Use explicit version so branch name and tag are consistent.
Run "npm version $Version -m 'chore(release): %s'"

# Sanity-check: ensure src/bot.ts VERSION gets updated (if project uses this pattern)
$botPath = Join-Path (Get-Location) 'src\bot.ts'
if (Test-Path $botPath) {
  $bot = Get-Content $botPath -Raw
  if ($bot -notmatch [regex]::Escape("export const VERSION = `"$Version`"")) {
    Write-Warning "src\bot.ts does not contain 'export const VERSION = \"$Version\"'. If you rely on this constant, ensure your postversion hook updates it."
  }
}

# --- Push branch & tags ---
if ($Push) {
  Run "git push -u origin $relBranch --follow-tags"
} else {
  Write-Host "Not pushing (omit -Push to push manually later)." -ForegroundColor DarkYellow
}

# --- Create PR (optional) ---
if ($CreatePR) {
  # If gh not authenticated, this will prompt interactively.
  $title = "Release $Version"
  $body  = "Bump to $Version"
  Run "gh pr create --base $BaseBranch --head $relBranch --title `"$title`" --body `"$body`""
} else {
  Write-Host "PR not created (add -CreatePR to auto-open one)." -ForegroundColor DarkYellow
}

# --- Create GitHub Release (optional) ---
if ($CreateRelease) {
  # Requires pushed tag v<version>
  $tag = "v$Version"
  if (-not $Push) {
    Write-Warning "CreateRelease requested but -Push was not provided. Ensure tag '$tag' exists on origin before running gh release."
  }
  Run "gh release create $tag --generate-notes"
} else {
  Write-Host "GitHub Release not created (add -CreateRelease to auto-generate notes)." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "✅ Done. Branch: $relBranch, Tag: v$Version" -ForegroundColor Green
if (-not $Push) {
  Write-Host "Next: git push -u origin $relBranch --follow-tags" -ForegroundColor Green
}
if (-not $CreatePR) {
  Write-Host "Then: create a PR to $BaseBranch" -ForegroundColor Green
}
if (-not $CreateRelease) {
  Write-Host "Optionally: gh release create v$Version --generate-notes" -ForegroundColor Green
}
