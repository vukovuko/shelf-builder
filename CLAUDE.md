## Workflow Preferences

- **Don't run `npm run build`** - Let me run it since it's faster and I can tell you to do other stuff while it's running.
- **Never run database commands** - Don't run any database commands (migrations, seeds, drizzle-kit, etc.) on your own. Just tell me what to run. If commands need to be sequential, tell me the order and I'll run them and paste errors or success from the terminal.

---
title: Minimize Serialization at RSC Boundaries
impact: HIGH
impactDescription: reduces data transfer size
tags: server, rsc, serialization, props
---

## Minimize Serialization at RSC Boundaries

The React Server/Client boundary serializes all object properties. Only pass fields that the client actually uses.

**Incorrect (serializes all 50 fields):**

```tsx
async function Page() {
  const user = await fetchUser()  // 50 fields
  return <Profile user={user} />
}

'use client'
function Profile({ user }: { user: User }) {
  return <div>{user.name}</div>  // uses 1 field
}
```

**Correct (serializes only 1 field):**

```tsx
async function Page() {
  const user = await fetchUser()
  return <Profile name={user.name} />
}

'use client'
function Profile({ name }: { name: string }) {
  return <div>{name}</div>
}
```

---
title: Parallel Data Fetching with Component Composition
impact: HIGH
impactDescription: eliminates server-side waterfalls
tags: server, rsc, parallel-fetching, composition
---

## Parallel Data Fetching with Component Composition

React Server Components execute sequentially within a tree. Restructure with composition to parallelize data fetching.

**Incorrect (Sidebar waits for Page's fetch to complete):**

```tsx
export default async function Page() {
  const header = await fetchHeader()
  return (
    <div>
      <div>{header}</div>
      <Sidebar />
    </div>
  )
}

async function Sidebar() {
  const items = await fetchSidebarItems()
  return <nav>{items.map(renderItem)}</nav>
}
```

**Correct (both fetch simultaneously):**

```tsx
async function Header() {
  const data = await fetchHeader()
  return <div>{data}</div>
}

async function Sidebar() {
  const items = await fetchSidebarItems()
  return <nav>{items.map(renderItem)}</nav>
}

export default function Page() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  )
}
```

**Alternative with children prop:**

```tsx
async function Layout({ children }: { children: ReactNode }) {
  const header = await fetchHeader()
  return (
    <div>
      <div>{header}</div>
      {children}
    </div>
  )
}

async function Sidebar() {
  const items = await fetchSidebarItems()
  return <nav>{items.map(renderItem)}</nav>
}

export default function Page() {
  return (
    <Layout>
      <Sidebar />
    </Layout>
  )
}
```

---
title: Strategic Suspense Boundaries
impact: HIGH
impactDescription: faster initial paint
tags: async, suspense, streaming, layout-shift
---

## Strategic Suspense Boundaries

Instead of awaiting data in async components before returning JSX, use Suspense boundaries to show the wrapper UI faster while data loads.

**Incorrect (wrapper blocked by data fetching):**

```tsx
async function Page() {
  const data = await fetchData() // Blocks entire page
  
  return (
    <div>
      <div>Sidebar</div>
      <div>Header</div>
      <div>
        <DataDisplay data={data} />
      </div>
      <div>Footer</div>
    </div>
  )
}
```

The entire layout waits for data even though only the middle section needs it.

**Correct (wrapper shows immediately, data streams in):**

```tsx
function Page() {
  return (
    <div>
      <div>Sidebar</div>
      <div>Header</div>
      <div>
        <Suspense fallback={<Skeleton />}>
          <DataDisplay />
        </Suspense>
      </div>
      <div>Footer</div>
    </div>
  )
}

async function DataDisplay() {
  const data = await fetchData() // Only blocks this component
  return <div>{data.content}</div>
}
```

Sidebar, Header, and Footer render immediately. Only DataDisplay waits for data.

**When NOT to use this pattern:**

- Critical data needed for layout decisions (affects positioning)
- SEO-critical content above the fold
- Small, fast queries where suspense overhead isn't worth it
- When you want to avoid layout shift (loading → content jump)

**Trade-off:** Faster initial paint vs potential layout shift. Choose based on your UX priorities.

---
title: Prevent Waterfall Chains in API Routes
impact: CRITICAL
impactDescription: 2-10× improvement
tags: api-routes, server-actions, waterfalls, parallelization
---

## Prevent Waterfall Chains in API Routes

In API routes and Server Actions, start independent operations immediately, even if you don't await them yet.

**Incorrect (config waits for auth, data waits for both):**

```typescript
export async function GET(request: Request) {
  const session = await auth()
  const config = await fetchConfig()
  const data = await fetchData(session.user.id)
  return Response.json({ data, config })
}
```

**Correct (auth and config start immediately):**

```typescript
export async function GET(request: Request) {
  const sessionPromise = auth()
  const configPromise = fetchConfig()
  const session = await sessionPromise
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id)
  ])
  return Response.json({ data, config })
}
```

For operations with more complex dependency chains, use `better-all` to automatically maximize parallelism (see Dependency-Based Parallelization).

---
title: Fix overflow-x-auto in Flexbox/Grid with min-w-0
impact: HIGH
impactDescription: enables horizontal scroll in flex children
tags: css, flexbox, grid, overflow, responsive
---

## Fix overflow-x-auto in Flexbox/Grid with min-w-0

In Flexbox and Grid, children have implicit `min-width: auto` which prevents them from shrinking below their content's intrinsic width. This breaks `overflow-x-auto` because the container expands to fit content instead of scrolling.

**Incorrect (table expands dialog beyond viewport):**

```tsx
<DialogContent>
  <form>
    <div className="overflow-x-auto">
      <table className="min-w-[520px]">  {/* Wide table */}
        ...
      </table>
    </div>
  </form>
</DialogContent>
```

The table's width propagates up through all flex parents, expanding the dialog.

**Correct (add min-w-0 to flex children):**

```tsx
<DialogContent>
  <form className="min-w-0">                      {/* Can shrink */}
    <div className="min-w-0">                     {/* Can shrink */}
      <div className="overflow-x-auto min-w-0">   {/* Can shrink, scrolls */}
        <table className="min-w-[520px]">         {/* Forces scroll trigger */}
          ...
        </table>
      </div>
    </div>
  </form>
</DialogContent>
```

**Why it works:**

1. `min-w-0` sets `min-width: 0`, allowing flex children to shrink below content width
2. This breaks the chain of content-width propagation
3. `overflow-x-auto` wrapper is now constrained by its parent, not its children
4. When table > container width, horizontal scroll appears

**Additional tips:**

- Use `table-fixed` + width percentages on `<th>` for predictable column sizing
- Use `sm:min-w-full` to disable scroll on larger screens
- Add `break-words` to text cells that should wrap