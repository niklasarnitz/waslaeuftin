# waslaeuft.in

Turborepo for the waslaeuft.in web app and future Expo clients.

## Workspaces

- `apps/nextjs`: Next.js web app and HTTP adapters
- `apps/expo`: Expo client scaffold consuming the shared tRPC contract
- `packages/api`: tRPC routers and client-safe router types
- `packages/db`: Prisma client, schema, and migrations
- `packages/validators`: schemas shared by web, API, and mobile clients
- `packages/ui`: shared UI primitives from the original starter
- `tooling/*`: shared TypeScript, ESLint, Prettier, and Tailwind config

The `@waslaeuftin/api` root export contains only types and is safe to import from
Expo. Server runtimes use `@waslaeuftin/api/server`. Prisma stays behind
`@waslaeuftin/db` and must not be imported by mobile code.

## Development

```bash
bun install
cp .env.example .env
bun run db:push
bun run dev:web
```

Start the Expo client separately:

```bash
bun --filter @waslaeuftin/expo dev
```

## Verification

```bash
bun run typecheck
bun run lint
bun run build
bun run test:web
```
