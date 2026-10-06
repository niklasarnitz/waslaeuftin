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

## CinemaxX / Vue

CinemaxX uses its direct guest API, including HOLI Hamburg. The `CinemaxxVue`
provider participates in nightly and manual updates. Each successful refresh
replaces that cinema's schedule and updates `lastFetchedAt` in one transaction;
failed or empty feeds retain the previous schedule. Manual Run actions always
refetch all cinemas for the selected providers; scheduled updates retain the
five-hour freshness filter.

To migrate existing Kinoheld cinema records without changing IDs or slugs, run
from the repository root with the database, TMDB, and S3 environment configured:

```bash
bun apps/nextjs/scripts/migrate-cinemaxx-vue-cinemas.ts
bun apps/nextjs/scripts/migrate-cinemaxx-vue-cinemas.ts --apply
```

The first command previews exact venue matches. Applying validates all feeds,
saves a rollback snapshot under `.cache`, and atomically replaces the schedules
and provider mappings. Cinemas absent from the database are reported, not created.
Deploy the provider code along with the migration so subsequent nightly updates
continue using the direct source.

## Verification

```bash
bun run typecheck
bun run lint
bun run build
bun run test:web
```
