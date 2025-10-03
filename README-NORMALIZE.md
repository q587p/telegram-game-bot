# Normalize line endings PR

This kit adds `.gitattributes` and `.editorconfig` to standardize line endings (LF by default),
then performs a one-time repository-wide renormalization so CRLF/LF noise disappears in future diffs.

## One-commit flow (recommended)

```bash
git checkout -b chore/normalize-eol
copy .gitattributes .
copy .editorconfig .         # (Windows) or: cp .gitattributes . && cp .editorconfig .
git add .gitattributes .editorconfig
git add --renormalize .
git commit -m "chore: normalize line endings (.gitattributes, .editorconfig, renormalize)"
git push -u origin chore/normalize-eol
```

If a Husky pre-commit hook blocks this commit (e.g., running type checks), either fix code first or (for this single normalization commit) do:
```bash
git commit -m "chore: normalize line endings (.gitattributes, .editorconfig, renormalize)" --no-verify
```

Then open a PR `chore/normalize-eol -> main` and merge.

## TortoiseGit (Windows) quick steps
1. Create branch `chore/normalize-eol`.
2. Drop `.gitattributes` and `.editorconfig` into repo root.
3. TortoiseGit → Add... select both files.
4. TortoiseGit → Add (to stage) — tick "Whole project" → Advanced → check "AutoCRLF" OFF (optional; `.gitattributes` drives normalization anyway).
5. TortoiseGit → Commit... → "Add .gitattributes & .editorconfig" → OK (use *Commit & Push* if you like).
6. Run `git add --renormalize .` in the repo (or via TortoiseGit: "Add" with select-all again).
7. Commit again with message "Normalize line endings" OR keep it as a single commit by doing step 6 before opening the first commit dialog.
8. Push branch and open PR.

## Notes
- `.gitattributes` is the source of truth for EOL, independent of `core.autocrlf`.
- Editors will follow `.editorconfig` to avoid future accidental CRLF.
- This change is content-safe: it only touches newlines.
