# AGENTS.md

## Before committing

Run these from the repo root and make sure they all pass. CI runs the same checks, and the Docker image
is only built and deployed when they pass.

```sh
bun run typecheck
bun run lint && bun run lint:ws
bun run format
```

To auto-fix issues, use `bun run lint:fix` and `bun run format:fix`, then re-run the checks.

`bun run lint` needs a `.env` file; copy `.env.example` to `.env` if you don't have one.
