# Next.js → TanStack Start on Cloudflare Workers

`main` is the TanStack Start app, and since 12 Nov 2026 (22:06 CET) it is
what ormanipomeri.com serves, from the Worker `ormanipomeri`. It was built on
the branch `tanstack-start`, which became `main` on 13 Nov 2026.

The Next.js app that ran on Vercel is kept on the branch `next-vercel` (the
last commit of the old `main`), for reference and rollback. Vercel no longer
builds anything: `vercel.json` here switches its deployments off.

Nothing deploys by itself. A push to `main` changes GitHub only; the site
changes when someone runs `npm run deploy:production`.

Dev build: https://ormanipomeri-dev.vukasinovicvuko5.workers.dev

Production: https://ormanipomeri.com (see "Production"). Its workers.dev
address is switched off.

The dev build and local dev use the Neon branch `dev`, never the production
database.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev on the Workers runtime, port 3000. Secrets come from `.dev.vars` (copy your `.env`). `.env` also needs `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` set to the Neon `dev` branch string. |
| `npm run deploy` | Build and deploy the `ormanipomeri-dev` Worker. |
| `npm run deploy:production` | Build the production site (`--mode live`, wrangler environment `production`) and deploy the `ormanipomeri` Worker. |
| `npm run typecheck` | Checks the ported files and everything they import. |
| `npm run test:run` | The vitest suite. |
| `python3 scripts/route_audit.py <origin> --all .` | Requests every page and every API handler method the old app had (read from `origin/next-vercel`) and flags any that answer 404, 405 or 5xx. Writes are sent empty and unsigned, so handlers refuse them. `--safe` sends only GETs; use that against production. Run it before every production deploy that touches routes. |

## How the branch is laid out

- `src/routes` is the new app. `src/app` is the old Next.js app, kept only as
  the reference for each route until that route is ported, then deleted.
  The exception is `src/app/api`: those handlers are live, see "API bridge".
- `src/lib`, `src/components`, `src/db` and `src/hooks` kept the paths they
  had in the Next.js app, which is why many files still say `"use client"`
  and import `next/*`.
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

- `EMAIL_MODE=redirect` (in `wrangler.jsonc`, so local dev has it too): every
  email goes to the address in `EMAIL_REDIRECT_TO` and its subject starts with
  `[DEV, za <real recipient>]`. Without `EMAIL_REDIRECT_TO` nothing is sent.
  The database is a copy of production, so this is what keeps a test from
  writing to a real customer. Mailing-list sync to Resend is skipped too.
  `/dev/status` shows which of the three states a build is in.
- `RESEND_API_KEY` is the real key, so redirected emails are delivered. With
  `re_dev_no_email` in its place Resend refuses every send.
- Turnstile runs on Cloudflare's always-pass test keys
  (`NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`,
  `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`).
- Upstash is not set: customer forms let the request through when the rate
  limiter is unreachable.
- PostHog is not loaded.

Locally these live in `.env` and `.dev.vars`; on the Worker they are secrets
(`wrangler secret put`).

A test account exists only in the Neon branch `dev`; there it also has the
admin role, so the admin can be tested without a real admin's password. Its email and password
are `DEV_TEST_EMAIL` and `DEV_TEST_PASSWORD` in the local `.env`. It has one
saved design and four orders: #1032 (a copy of a real order's design and
prices with made-up contact details) and #1033 to #1035 (placed through the
checkout dialog).

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
- Events go through `capture()` in `src/lib/track.ts`, never a direct
  `posthog-js` import: one such import in a shared component puts the whole
  library (60 KB gzipped) in the first script of every page. The same goes
  for jsPDF: import the exports from `src/lib/pdf/lazy.ts`.
- `fetchQuery`, `prefetchQuery` and `ensureQueryData` are marked deprecated in
  the installed query-core 5.107 (`queryClient.query(...)` replaces them in
  the next major). They work and are used in 33 places; swap them when
  upgrading Query, and keep `Infinity` (not `"static"`) in
  `cachedUnlessChanged`, because `"static"` ignores invalidation.
- Server routes (`server.handlers`) are only for callers outside the app:
  auth, MCP, sitemap, robots, llms.txt.
- `import { db } from "@/db/db"` works as before. It opens connections per
  request (see the comment in that file), so never keep a query result's
  client or a transaction in a module-level variable.

## Production

The production site is the Worker `ormanipomeri` (wrangler environment
`production`). What makes a build the production one:

- `vite build --mode live` reads `.env.live` (not in git): the public
  Turnstile and PostHog keys and `VITE_INDEXABLE=true`. Only this mode puts
  the PostHog key in the bundle, so only this build reports visits.
- `CLOUDFLARE_ENV=production` selects the production block of
  `wrangler.jsonc`: its own Hyperdrive (the production Neon database) and no
  `EMAIL_MODE`, so email goes to its real recipients.
- Uploaded images go to the R2 bucket `ormari-po-meri` through the binding
  `UPLOADS`; only `R2_BASE_URL` (the public address) is still read from the
  environment. The dev Worker writes to the same bucket.
- Its secrets were copied from Vercel's production environment. Vercel hands
  back `[SENSITIVE]` instead of the value for `ANTHROPIC_API_KEY` and
  `MCP_API_KEY`; those two were set from the local copies.
- `/dev/status` answers 404 on this build.
- Any host other than ormanipomeri.com gets `X-Robots-Tag: noindex`
  (`src/start.ts`), so the workers.dev address and the to-do board's host
  are not indexed. `www` redirects to the bare domain.
- On the workers.dev address nobody can sign in or submit a form: Better
  Auth and Turnstile accept the real domain only. It is for reading.

### The domain move (done 12 Nov 2026)

The zone is on Cloudflare. The production block of `wrangler.jsonc` lists
`ormanipomeri.com`, `www` and `todo` as custom domains, so every
`npm run deploy:production` keeps them attached.

Cloudflare refuses to attach a custom domain while the name has other DNS
records, also when wrangler asks it to override them. The six A records that
pointed at Vercel were deleted by hand first.

To go back to Vercel: remove the `routes` from the production block, deploy,
delete the three Worker records in DNS, and re-create these (all DNS only):

| Name | Type | Value |
| --- | --- | --- |
| `ormanipomeri.com` | A | `64.29.17.1`, `216.198.79.1` |
| `www.ormanipomeri.com` | A | `216.198.79.65`, `64.29.17.65` |
| `*.ormanipomeri.com` | A | `216.198.79.65`, `216.198.79.1` |

Behind Cloudflare's proxy two things are new:

- Cloudflare adds its own Web Analytics script to every page
  (`static.cloudflareinsights.com/beacon.min.js`). The CSP blocks it, which
  logs one console error per page. Either switch Web Analytics off for the
  zone or allow that host in `src/server/security-headers.ts`.
- A request that starts a new Worker instance takes about half a second
  longer (the bundle is 1.9 MB).

## Things that broke after the move, and why

- **Registration** answered 404 for three hours. `/api/auth/signup-with-link`
  is our own handler, but everything under `/api/auth` goes to Better Auth's
  catch-all route, which does not know it. It now has its own route file. A
  route file in `src/routes/api` always wins over the bridge: check for old
  handlers under its path before adding one.
- **Image uploads** (admin materials, handles, accessories, and images during
  the Agacija sync) answered 500. The AWS SDK's S3 client does not survive
  the Workers build. Uploads now use the Worker's bucket binding
  (`src/lib/r2.ts`).
- The first **dev database branch** vanished after a day: the Neon Console
  creates branches with "Automatically delete branch after 1 day" ticked.
  Untick it when making a branch.

Signing in with an existing account was the only auth flow tested before the
move. Since then, on the dev link: register, the activation link, password
reset, saving address and phone, checkout signed in and as a guest, order
status change, to-do notes, uploads, sketch import.

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

## Admin

- `/admin` is not rendered on the server (`ssr: false` on its layout), and
  every page imports its component behind `import.meta.env.SSR ? null :
  lazy(...)`, so tables, charts, the to-do board and the 3D view stay out of
  the Worker. The components are the old ones, moved to
  `src/components/admin` with their folders unchanged.
- The layout's `beforeLoad` asks the server who is asking: signed out goes to
  `/prijava?return_to=…`, signed in without the role goes home.
- Each page's data is one function in `src/server/admin/*.server.ts` that
  starts with `requireAdmin()`. The functions and their queries are in
  `src/server/admin/admin.functions.ts`.
- Lists and the dashboard are cache-first. Their loaders call
  `cachedUnlessChanged` (the cached copy, or a fresh one if a save marked it
  out of date) and the page reads `useSuspenseQuery`, so a revisit draws in
  about 20 ms and refetches behind it.
- Bulk actions of the lists (publish, draft, enable, disable, paid, fulfilled,
  delete, the models' publish switch) go through `useListAction(entity,
  rowsKey)` in `src/components/admin/list-actions.ts`: the rows change in the
  cache before the server answers and go back with an error toast if it
  refuses any of them. Actions on one list are sent one after another
  (`scope`), and only the last one running rolls back and refetches, so two
  quick clicks cannot overwrite each other.
- Every admin write ends in `invalidateAdminData`
  (`src/components/admin/admin-cache.ts`, which also holds the list keys):
  everything the admin has cached is marked out of date, plus the public
  catalog and configurator data in the same tab.
- Detail pages fetch fresh on every visit (`fetchQuery`, `staleTime: 0`) and
  read `Route.useLoaderData()`. Their forms copy the record into state once,
  so a form opened on old values would save them back. Three things keep that
  from happening, all in `src/router.tsx` or next to the forms:
  - `defaultStaleReloadMode: "blocking"`. Without it the router draws its own
    remembered copy of a page first and runs the loader behind it, and a
    material reopened after a save showed the price from before the save.
  - `defaultRemountDeps: ({ params }) => params`. Without it going from one
    record straight to another (history) keeps the first record's form state
    under the second record's address.
  - The forms still save through the old `/api/admin/*` handlers, but with
    `adminFetch` (`src/components/admin/admin-fetch.ts`) instead of `fetch`.
    A write the server accepted calls `invalidateAdminData` (the layout in
    `src/routes/admin/route.tsx` listens), so the list a form returns to is
    fetched again before it is shown. A new admin form must use `adminFetch`
    for its writes too.
- Record pages share their chrome (`src/components/admin/page-chrome.tsx`):
  `SaveBar` puts the save button in the layout's top bar, which stays on
  screen, disabled until something changed (`form="<id>"` submits the page's
  form, so `required` fields still block it); `PageHeader` has the way back,
  the title and the status (`StatusSelect`); `DeleteAction` goes at the
  bottom of the page, away from save. The material page is the model for the
  two-column layout. The user page keeps a save per card.

## Catalog cache

`/materijali`, `/rucke`, their detail pages, `sitemap.xml` and `llms-full.txt`
are served from KV (`src/server/edge-cache.server.ts`): the finished page
for a visitor who is not signed in, and the two lists every catalog page
starts from for everyone else. A hit takes about 50 ms; a render took
0.3–0.8 s.

- Every key carries a catalog version. A successful save under
  `/api/admin/materials`, `handles`, `accessories` or `settings` changes it
  (the API bridge does this), so the next visitor gets a fresh page. Other
  edge locations notice within 30 seconds.
- Keys also carry the build, so a deploy starts from an empty cache.
- Never cached: a request with a session cookie, a query string, another
  method, the to-do board's host, any page not in the list
  (`src/server/cached-pages.ts`, with tests).
- A change written straight to the database is not seen. Run
  `npm run catalog:refresh` after one; without it the old pages live at most
  a day.
- If KV fails or its daily write quota is used up, pages are rendered as
  before; nothing depends on the cache being there.

## First load

Measured on `/design` with Lighthouse (mobile, local production build, 13 Nov
2026): total blocking time 4,060 ms before, 200 ms after; the script every
page starts with went from 203 KB to 110 KB gzipped.

- PostHog loads after the page is interactive and is its own chunk. Session
  recording starts with the visitor's first tap, key press or scroll
  (`src/lib/analytics-client.ts`): it copies the 3D canvas four times a
  second, which during load competes with building the scene. A visit
  without any interaction is not recorded.
- jsPDF (124 KB gzipped) loads when someone exports a PDF.
- The lighting map of the 3D scene is `public/hdri/apartment-512.hdr` (379 KB,
  was 1.4 MB). It was halved in linear light (2x2 average); against the
  original no pixel of the render differs by more than 1/255. The original
  stays in `public/hdri` for pages opened before the change.
- `public/_headers` gives everything under `/assets` (content-hashed names) a
  one-year immutable cache, and `/hdri` and `/textures` 30 days. Workers
  serves static files with `max-age=0, must-revalidate` otherwise, which
  cost one request per file on every visit. A changed texture needs a new
  file name.

## Programs that read the site (AI agents)

Cloudflare's Agent Readiness scan (dashboard → AI Crawl Control → Agent
Readiness, or `POST https://isitagentready.com/api/scan`) put the site at
level 1 on 14 Nov 2026 and at level 3 ("Agent-Readable") after this:

- The Worker's entry is `src/server.ts`, which wraps TanStack Start's handler
  with `answerPrograms` (`src/server/agent-requests.ts`). Start's page
  renderer answers 406 to any request whose `Accept` header names neither
  `text/html` nor `*/*`; four scan checks failed on that alone. Such a
  request now gets the page.
- `Accept: text/markdown` gets the page as Markdown
  (`src/server/markdown-page.ts`): front matter from the meta tags, the
  content of `<main>`, then the page's JSON-LD. Cloudflare's own "Markdown
  for Agents" does this at the edge, but only on paid plans. Catalog pages
  keep their Markdown in the catalog cache (the materials list is 0.5 MB of
  HTML and takes over a second to convert).
- Every HTML page carries `Link` headers to `/llms.txt` and `/sitemap.xml`.
- `robots.txt` carries Content Signals (contentsignals.org):
  `ai-train=yes, search=yes, ai-input=yes`, the same choice as letting the
  AI crawlers in. Change it in `src/lib/seo/robots.ts` and in
  `CONTENT_SIGNAL` in `agent-requests.ts` together.

Left failing on purpose: the API catalog, MCP server card, auth.md, A2A card
and skills index describe an API or an agent that outside programs may use.
The only such thing here is the admin's private MCP server, and advertising
it helps nobody. The root `/.well-known/oauth-protected-resource` names
`/api/mcp` as its resource, which the scan reads as a mismatch; MCP clients
use the path-specific document from the `WWW-Authenticate` header, which is
correct, so it stays. The commerce checks need card payments through a
payment provider, which the shop does not have.

## Other hosts and AI assistants

- todo.ormanipomeri.com shows the to-do board at "/": the router maps that
  address to the `/todo-board` route on that host only
  (`src/lib/todo/host-rewrite.ts`), and robots.txt there disallows
  everything. The login handoff is `/admin/todo/otvori` → `/todo-auth`; its
  one-time token lives one minute.
- `/api/mcp` runs through the bridge. The OAuth discovery routes
  (`/.well-known/*`) and `/mcp/prijava` are route files that call the old
  handlers.

## Search params and errors

- The address carries plain query strings (`?search=1035&page=2`), as on the
  live site. The router's default writes JSON (`?search=%221035%22`), which
  the shared components, built on `URLSearchParams`, would misread. Every
  value arrives as text, so `validateSearch` converts what it needs.
- A server function that throws sends only "Server error" to the browser
  (`hideServerErrors` in `src/start.ts`); the real error is in the Worker
  log. Redirects and not-found pass through.
- Every response carries the live site's five security headers, CSP
  included (`src/server/security-headers.ts`, added in `src/start.ts`).
  Files from `public/` are served without the Worker and get them from
  `public/_headers`; a test fails if the two differ.

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
- Catalog pages are cached until the catalog changes (see "Catalog cache");
  Vercel re-rendered them once an hour.
- The HTML of `/design` has no step list or price before JavaScript runs; Next
  sent the sidebar markup. Title, description and canonical are the same.
- `/account` goes to `/account/wardrobes`; on the live site it is a 404.
- A signed-out visit to `/admin` is redirected by the browser after the page
  loads; Next redirected on the server.
- The admin's order search works. On the live site it fails for every term
  (`ILIKE` on the integer order number).
- The admin dashboard shows zero visits without PostHog keys instead of
  failing.
- The Worker upload is 1.9 MB gzip (the admin added 38 KB). Cloudflare's limit is 3 MB on the free
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
- [x] 5. Checkout and emails. `/api/checkout` runs unchanged through the bridge.
  Test orders went through on local dev and on the dev link (#1035): price
  rules, the transaction, the order in the account, and all five emails
  (confirmation, invoice with the IPS QR code, three admin notices) delivered
  to the redirect address only. Later: move the handler to a server function
- [x] 6. Admin: all 29 pages, reading through server functions and saving
  through the bridge
- [x] 6b. Admin: list actions are mutations with optimistic updates, lists
  and the dashboard read from the cache, forms always open on fresh data
  (13 Nov 2026). Tested on the dev link for every list: each action, a
  refused action going back, a save on a detail page followed by the list and
  the same detail page again. The catalog cache with purge is in place too
- [x] 7. Security headers and CSP, PostHog (proxy `/t/*`, browser client on
  the production build only), MCP server with its OAuth routes, AI sketch
  import, to-do board on its own host
- [x] 8. Domain cutover, 12 Nov 2026. Checked on the real domain without
  signing in: every sitemap address, indexing tags, security headers, www,
  the to-do host, the API's refusals, MCP with the key, the configurator in a
  browser. Signing in, saving, ordering and the admin need a person.
