# Project Agent Instructions

## Account Safety

- Treat `.project-context.json` as the source of truth for this repository's GitHub and Vercel identities.
- Before any GitHub or Vercel mutation, run `projectctl doctor`.
- Use `projectctl gh -- ...` for GitHub CLI operations, `projectctl push` for pushes, `projectctl vercel -- ...` for Vercel CLI operations, and `projectctl deploy` for deployments.
- Never run bare `vercel` or a global `gh auth switch` for this repository.
- Keep tokens, OAuth files, SSH private keys, and credential paths out of Git.
