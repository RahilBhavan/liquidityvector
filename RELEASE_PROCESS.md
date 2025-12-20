# Release Process & Branching Strategy

## Branching Strategy

We follow a strict branching model to ensure stability and auditability.

```
main (protected)
├── develop (integration - optional)
├── feature/* (feature development)
└── release/RC-* (release candidates)
```

- **`main`**: The stable, production-ready code. **Protected branch.** No direct commits allowed. Requires PR reviews.
- **`feature/*`**: Create for new features or fixes (e.g., `feature/add-auth`, `fix/login-bug`).
- **`release/RC-YYYYMMDD`**: Release Candidate branches. Created from `feature` or `main` when preparing for a release. Final testing happens here.

## Release Checklist

Perform these steps for every release:

1.  **Preparation**
    - [ ] Ensure all tests pass (`npm run build`, `pytest`).
    - [ ] Create a release branch: `git checkout -b release/RC-YYYYMMDD`.

2.  **Versioning**
    - [ ] Determine the next semantic version (Major.Minor.Patch).
    - [ ] Update `version` in `package.json`.
    - [ ] Update `CHANGELOG.md` with new entries under the new version header.

3.  **Commit & Tag**
    - [ ] Commit version bump and changelog: `git commit -m "chore(release): bump version to X.Y.Z"`.
    - [ ] Create an annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z description"`.

4.  **Finalize**
    - [ ] Push branch and tags: `git push origin release/RC-YYYYMMDD --tags`.
    - [ ] Open a Pull Request from `release/RC-...` to `main`.
    - [ ] Verify CI/CD pipeline success.
    - [ ] Merge PR.

## Rollback Procedure

If a critical issue is found in production:

1.  **Identify Last Stable Tag**: `git tag --list` to find the previous working version (e.g., `v1.0.0`).
2.  **Revert**:
    - If code rollback: `git revert HEAD` (or specific PR merge commit) on `main`.
    - If infrastructure rollback: Redeploy the artifact corresponding to the previous stable tag.
3.  **Post-Mortem**: Document the incident and update tests to prevent recurrence.
