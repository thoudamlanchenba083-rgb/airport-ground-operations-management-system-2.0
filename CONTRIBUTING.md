# Contributing Guide

## Branching Strategy

We use a simplified Git Flow model:

- `main` — always production-ready. Only updated via reviewed PRs from `develop` or hotfix branches.
- `develop` — integration branch. All feature branches merge here first.
- `feature/<short-description>` — one branch per feature/task, branched from `develop`.
  Example: `feature/gate-heatmap`, `feature/staff-shift-validation`
- `bugfix/<short-description>` — for non-urgent bug fixes, branched from `develop`.
- `hotfix/<short-description>` — urgent production fixes, branched from `main`,
  merged into both `main` and `develop`.

## Workflow

1. Pull latest `develop`: `git checkout develop && git pull`
2. Create a branch: `git checkout -b feature/my-change`
3. Commit with clear messages (see below)
4. Push branch: `git push -u origin feature/my-change`
5. Open a Pull Request into `develop`
6. At least 1 reviewer approval required before merge
7. CI (GitHub Actions) must pass (tests + lint) before merge
8. Delete the branch after merge

## Commit Message Convention
<type>: <short summary>
Types: feat, fix, docs, test, refactor, chore, perf
Example: feat: add gate heatmap component
Example: fix: correct staff shift overlap validation
## Code Review Checklist

- [ ] Tests added/updated for the change
- [ ] No hardcoded secrets or credentials
- [ ] Follows existing code style (flake8 clean for backend)
- [ ] API changes reflected in Swagger docstrings
- [ ] No breaking changes to existing endpoints without version discussion

## Release Process

1. `develop` is merged into `main` only when a release is ready
2. Tag the release: `git tag -a v1.x.x -m "Release notes"`
3. Deploy from `main` (see `docs/DEPLOYMENT.md`)