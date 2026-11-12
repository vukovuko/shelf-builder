# Next.js → TanStack Start on Cloudflare Workers

This branch (`tanstack-start`) is the new app. `main` stays the Next.js app that
Vercel serves at ormanipomeri.com until the domain is moved over.

Dev build: https://ormanipomeri-dev.vukasinovicvuko5.workers.dev

The dev build and local dev on this branch use the Neon branch `dev`, never
the production database.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev on the Workers runtime, port 3000. Secrets come from `.dev.vars` (copy your `.env`). `.env` also needs `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` set to the Neon `dev` branch string. |
| `npm run deploy` | Build and deploy the `ormanipomeri-dev` Worker. |
| `npm run typecheck` | Generates Worker types, then checks the ported files. |
| `npm run test:run` | Same vitest suite as `main`. |

## How the branch is laid out

- `src/routes` is the new app. `src/app` is the old Next.js app, kept only as
  the reference for each route until that route is ported, then deleted.
- `src/lib`, `src/components`, `src/db` and `src/hooks` keep their paths, so
  `git merge main` brings shared changes over. A change on `main` to a file
  already deleted here shows up as a conflict: port that change by hand.
- `tsconfig.json` includes only ported files. Add a folder there when it moves.
- Shared components keep `import Link from "next/link"` and friends. Vite and
  tsconfig point those imports at `src/compat/next`, so one component file
  works in both apps. New code in `src/routes` uses TanStack Router directly.
  The stand-ins go away after the cutover.
- A page is ported when its route in `src/routes` matches the live page
  (same sections, headings, links, title, description, canonical, JSON-LD);
  then its file in `src/app` is deleted. Check it with
  `VITE_INDEXABLE=true npm run dev` and
  `uv run scripts/parity.py http://localhost:3000 /faq /blog ...`, which
  compares each path with ormanipomeri.com.
- Search engines may index a build only when it is built with
  `VITE_INDEXABLE=true`. Without it every page is `noindex` and robots.txt
  disallows everything, which is what the workers.dev build wants.
- Vercel does not build this branch (`vercel.json`).

## Conventions

- Server code that the browser calls goes in `*.functions.ts` as
  `createServerFn`, with zod validation and the auth check inside the function.
  Code that must never reach the browser goes in `*.server.ts`.
- Reads go through TanStack Query: `queryOptions` next to the server function,
  `ensureQueryData` in the loader for what the page cannot render without, and
  `prefetchQuery` without `await` for the rest.
- Writes are `useMutation` with an optimistic update and `invalidateQueries`
  for the keys they change. No `router.refresh()`.
- Server routes (`server.handlers`) are only for callers outside the app:
  auth, MCP, sitemap, robots, llms.txt.
- `import { db } from "@/db/db"` works as before. It opens connections per
  request (see the comment in that file), so never keep a query result's
  client or a transaction in a module-level variable.

## Known differences from the live site

- Article and catalog pages also carry `og:site_name`, `og:locale` and
  `og:type`; Next dropped them whenever a page set its own Open Graph tags.
- The blog author picture is a 256 px JPEG, not the 10 MB original: nothing
  resizes images on Workers.
- Catalog pages are rendered on every request (150–300 ms). Vercel cached them
  for an hour. Edge caching comes with the admin port, when a price change can
  purge the pages it affects.

## Phases

- [x] 0. Skeleton, per-request database, Better Auth handler, dev deploy
- [x] 0b. Neon branch `dev` + Hyperdrive binding (query caching off)
- [x] 1. Shared components run unchanged: `next/link`, `next/navigation` and
  `next/image` resolve to stand-ins in `src/compat/next`; Poppins is self-hosted
- [ ] 2. Public pages and SEO: home, blog, FAQ, materijali, ručke, privacy,
  terms, sitemap.xml, robots.txt and llms.txt done; contact (first form with a
  server function) to do
- [ ] 3. Configurator (`/design`, `/design-test`), saving designs
- [ ] 4. Sign-in and customer account
- [ ] 5. Checkout and emails
- [ ] 6. Admin
- [ ] 7. MCP server, AI sketch import, todo board, PostHog proxy, CSP
- [ ] 8. Domain cutover
