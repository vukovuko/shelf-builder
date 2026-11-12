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
| `npm run typecheck` | Checks the ported files and everything they import. |
| `npm run test:run` | Same vitest suite as `main`. |

## How the branch is laid out

- `src/routes` is the new app. `src/app` is the old Next.js app, kept only as
  the reference for each route until that route is ported, then deleted.
  The exception is `src/app/api`: those handlers are live, see "API bridge".
- `src/lib`, `src/components`, `src/db` and `src/hooks` keep their paths, so
  `git merge main` brings shared changes over. A change on `main` to a file
  already deleted here shows up as a conflict: port that change by hand.
- `tsconfig.json` includes only ported files. Add a folder there when it moves.
- Shared components keep `import Link from "next/link"` and friends. Vite and
  tsconfig point those imports at `src/compat/next`, so one component file
  works in both apps. New code in `src/routes` uses TanStack Router directly.
  The stand-ins go away after the cutover. `next/headers` and `next/server`
  have stand-ins too, for the API handlers.
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

## Dev keys

The dev build must not reach real people or real analytics:

- `RESEND_API_KEY=re_dev_no_email`: Resend refuses it, so no email goes out.
  Server code logs the failure and carries on.
- Turnstile runs on Cloudflare's always-pass test keys
  (`NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`,
  `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`).
- Upstash is not set: customer forms let the request through when the rate
  limiter is unreachable.
- PostHog is not loaded.

Locally these live in `.env` and `.dev.vars`; on the Worker they are secrets
(`wrangler secret put`).

A test customer exists only in the Neon branch `dev`. Its email and password
are `DEV_TEST_EMAIL` and `DEV_TEST_PASSWORD` in the local `.env`. It has one
saved design and two orders: #1032 (a copy of a real order's design and prices
with made-up contact details) and #1033 (placed through the checkout dialog).

Not set on the dev Worker yet, so these do nothing there: `ANTHROPIC_API_KEY`
(sketch import), the Google keys (sign-in, address suggestions in checkout),
Upstash.

## Conventions

- Server code that the browser calls goes in `*.functions.ts` as
  `createServerFn`, with zod validation and the auth check inside the function.
  Code that must never reach the browser goes in `*.server.ts`.
- Reads go through TanStack Query: `queryOptions` next to the server function,
  `ensureQueryData` in the loader for what the page cannot render without, and
  `prefetchQuery` without `await` for the rest.
- Writes are `useMutation` with an optimistic update and `invalidateQueries`
  for the keys they change. No `router.refresh()`. A server function returns
  `{ ok: false, error }` for an outcome the form shows to the visitor (rate
  limit, failed verification) and throws only for what nobody expected.
- Server routes (`server.handlers`) are only for callers outside the app:
  auth, MCP, sitemap, robots, llms.txt.
- `import { db } from "@/db/db"` works as before. It opens connections per
  request (see the comment in that file), so never keep a query result's
  client or a transaction in a module-level variable.

## API bridge

`src/routes/api/$.ts` serves every `src/app/api/**/route.ts` handler as it is,
so the components that call `fetch("/api/...")` keep working before they are
rewritten. A route file in `src/routes/api` wins over the bridge (auth has
one). When the last caller of a handler moves to a server function, delete the
handler; the bridge goes away with the last of them.

## Signed-in pages

- A route that depends on who is signed in calls `loadCurrentUser` in
  `beforeLoad` (`src/server/session.functions.ts`). It reuses a cached user
  but always asks the server again when the cache says nobody is signed in.
- `/account/*` has one layout (`src/routes/account/route.tsx`). Signed out, it
  shows the sign-in form in place, with no redirect, so a link from an order
  email works after signing in. Its child loaders skip their data when
  `context.user` is empty.
- Every function in `src/server/account.server.ts` checks the session itself
  and returns `null` when nobody is signed in.
- When someone signs in, signs out or edits their profile, the auth client
  tells `SessionSync` (in the root) and every cached query is marked stale.
  The link between the two is `src/lib/session-events.ts`, so pages without a
  sign-in form do not load the auth client.
- "Moji ormani" is the model for writes: `useMutation`, the change shown at
  once, put back if the server refuses, then `invalidateQueries`. The other
  account forms still post to the old handlers and call `router.refresh()`,
  which here means "refetch every query".

## Configurator

`/design` and `/design-test` draw in the browser only: the server sends the
head tags and an empty page, and three.js never enters the Worker bundle
(`src/components/designer/DesignerShell.tsx`). The catalogs and the session
are one query (`designerDataQuery`) that the loader starts without waiting
for it, so the data arrives in the same response as the page.

## Known differences from the live site

- Article and catalog pages also carry `og:site_name`, `og:locale` and
  `og:type`; Next dropped them whenever a page set its own Open Graph tags.
- The blog author picture is a 256 px JPEG, not the 10 MB original: nothing
  resizes images on Workers.
- Catalog pages are rendered on every request (150–300 ms). Vercel cached them
  for an hour. Edge caching comes with the admin port, when a price change can
  purge the pages it affects.
- The HTML of `/design` has no step list or price before JavaScript runs; Next
  sent the sidebar markup. Title, description and canonical are the same.
- `/account` goes to `/account/wardrobes`; on the live site it is a 404.
- The Worker upload is 1.9 MB gzip. Cloudflare's limit is 3 MB on the free
  plan and 10 MB on the paid one.

## Phases

- [x] 0. Skeleton, per-request database, Better Auth handler, dev deploy
- [x] 0b. Neon branch `dev` + Hyperdrive binding (query caching off)
- [x] 1. Shared components run unchanged: `next/link`, `next/navigation` and
  `next/image` resolve to stand-ins in `src/compat/next`; Poppins is self-hosted
- [x] 2. Public pages and SEO: home, blog, FAQ, contact, materijali, ručke,
  privacy, terms, sitemap.xml, robots.txt, llms.txt
- [x] 3. Configurator (`/design`, `/design-test`), saving and loading designs;
  the remaining API handlers run through the bridge
- [x] 4. Sign-in pages (`/prijava`, `/reset-password`, `/verify-success`) and
  the customer account (`/account/*`)
- [ ] 5. Checkout and emails. `/api/checkout` runs unchanged through the bridge
  and a test order went through on local dev: price rules, the transaction,
  the order in the account, and the five emails attempted after the response
  (refused by the placeholder key). Left: one order on the dev link, a real
  email delivered, then moving the handler to a server function
- [ ] 6. Admin
- [ ] 7. MCP server, AI sketch import, todo board, PostHog proxy, CSP
- [ ] 8. Domain cutover
