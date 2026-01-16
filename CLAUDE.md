## Workflow Preferences

- **Don't run `npm run build`** - Let me run it since it's faster and I can tell you to do other stuff while it's running.
- **Never run database commands** - Don't run any database commands (migrations, seeds, drizzle-kit, etc.) on your own. Just tell me what to run. If commands need to be sequential, tell me the order and I'll run them and paste errors or success from the terminal.

---

## CarcassFrame Panel Architecture (3D Wardrobe Rendering)

The wardrobe 3D scene is rendered in `src/components/CarcassFrame/CarcassFrame.tsx`. Understanding the panel system is critical for any modifications.

### Key Concepts

**Coordinate System:**
- Origin (0, 0, 0) is at the CENTER of the wardrobe
- X axis: left (-) to right (+)
- Y axis: bottom (0) to top (h)
- Z axis: back (-) to front (+)
- All dimensions are in METERS (cm / 100)

**Module System:**
- Wardrobes > 200cm tall are split into "BottomModule" and "TopModule"
- Wardrobes ≤ 200cm have a single "SingleModule"
- The base (Baza) only applies to BottomModule or SingleModule

### The `panels` useMemo (lines ~214-292)

This is where ALL structural panels are calculated and rendered. There are several types:

```
┌─────────────────────────────────────┐
│           Top Panel                 │
├───────┬───────────────┬─────────────┤
│       │               │             │
│ Side  │  Side Seam    │  Side Seam  │  Side
│  L    │     A         │     B       │   R
│       │               │             │
├───────┴───────────────┴─────────────┤
│          Bottom Panel               │
├─────────────────────────────────────┤
│              BASE                   │  (empty space when hasBase=true)
└─────────────────────────────────────┘
```

**Panel Types:**
1. **Side L / Side R** - Outer left and right panels (full height, go to floor)
2. **Side seam** - Internal dividers between columns A, B, C (should STOP at base)
3. **Top / Bottom** - Horizontal panels (Bottom is raised by baseH when base enabled)

### How Base (Baza) Works

When `hasBase = true`:
- `baseH = baseHeightCm / 100` (convert cm to meters)
- **Bottom panel**: Y position raised by `baseH` (line ~276: `yBottom = m.yStart + raise + t / 2`)
- **Side seam panels**: Height reduced by `baseH`, Y position shifted up

**The Fix for Side Seams (lines 250-267):**
```typescript
} else {
  // Internal seam: two touching panels - stop at base, don't go through it
  const raiseForSeam =
    hasBase && (m.label === "BottomModule" || m.label === "SingleModule")
      ? baseH
      : 0;
  const seamHeight = m.height - raiseForSeam;  // Shorter by base amount
  const seamCy = (m.yStart + raiseForSeam + m.yEnd) / 2;  // Centered in remaining space
  list.push({
    label: `Side seam ${idx}A (${m.label})`,
    position: [x - t / 2, seamCy, 0],
    size: [t, seamHeight, d],
  });
  // ... same for Side seam B
}
```

### The `dividers` Array (lines ~136-146)

**IMPORTANT:** This is NOT for rendering panels! It's only for:
- Interactive drag handles (the buttons you can click to move dividers)
- Label positioning

The actual visual panels come from the `panels` useMemo above.

### BlueprintView (2D Technical Drawing)

`src/components/BlueprintView.tsx` renders the 2D technical drawing (SVG).

**Coordinate System:**
- SVG has Y increasing DOWNWARD (opposite of 3D)
- `frontViewY` = top of wardrobe
- `frontViewY + scaledHeight` = bottom of wardrobe
- `mapYFront(yFromBottomCm)` converts from bottom-up cm to SVG Y

**Dividers in BlueprintView (line ~296):**
```typescript
y2={frontViewY + scaledHeight - scaledBaseHeight}  // Stop at top of base
```

### Scene Invalidation

When store values change, the 3D scene needs to re-render. This is handled in `src/components/Scene.tsx` by the `ContextMonitor` component:

```typescript
useEffect(() => {
  invalidate();
}, [
  store.width,
  store.height,
  // ... other store values
  store.showDoors,  // Don't forget to add new store values here!
  invalidate,
]);
```

**If you add a new store value that affects rendering, add it to this dependency array!**

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

---
title: Dynamic Imports for Heavy Components
impact: CRITICAL
impactDescription: directly affects TTI and LCP
tags: bundle, dynamic-import, code-splitting, next-dynamic
---

## Dynamic Imports for Heavy Components

Use `next/dynamic` to lazy-load large components that aren't required during initial page render. This is especially important for heavy libraries like Three.js, Monaco Editor, or chart libraries.

**Incorrect (bundles 300KB+ with main chunk):**

```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export function Scene() {
  return (
    <Canvas>
      <OrbitControls />
      {/* ... */}
    </Canvas>
  )
}
```

**Correct (loads on demand):**

```tsx
import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading 3D view...</div>
})

export function Page() {
  return <Scene />
}
```

Use `{ ssr: false }` for browser-only components (WebGL, canvas, etc.).

---
title: Per-Request Deduplication with React.cache()
impact: MEDIUM
impactDescription: deduplicates within request
tags: server, cache, react-cache, deduplication
---

## Per-Request Deduplication with React.cache()

Wrap async functions with `cache()` to deduplicate calls within a single request. Multiple components calling the same cached function will only execute the query once.

```typescript
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { db } from '@/db/db'

export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return null
  return await db.query.user.findFirst({
    where: eq(user.id, session.user.id)
  })
})
```

Now multiple server components can call `getCurrentUser()` and the database query runs only once per request.

---
title: Narrow Effect Dependencies
impact: LOW
impactDescription: minimizes effect re-runs
tags: rerender, useEffect, dependencies, optimization
---

## Narrow Effect Dependencies

Specify primitive dependencies instead of objects to minimize effect re-runs.

**Incorrect (re-runs on any user field change):**

```tsx
useEffect(() => {
  console.log(user.id)
}, [user])
```

**Correct (re-runs only when id changes):**

```tsx
useEffect(() => {
  console.log(user.id)
}, [user.id])
```

**Derived state pattern:**

```tsx
// Instead of: re-run on every width pixel change
useEffect(() => {
  if (width < 768) enableMobileMode()
}, [width])

// Better: re-run only on mobile/desktop transition
const isMobile = width < 768
useEffect(() => {
  if (isMobile) enableMobileMode()
}, [isMobile])
```

---
title: Extract to Memoized Components
impact: MEDIUM
impactDescription: enables early returns before computation
tags: rerender, memo, useMemo, optimization
---

## Extract to Memoized Components

Extract expensive work into memoized components to enable early returns before computation.

**Incorrect (computation runs even during loading):**

```tsx
function Profile({ userId, isLoading }) {
  const avatarId = useMemo(() => computeAvatarId(userId), [userId])

  if (isLoading) return <Skeleton />
  return <Avatar id={avatarId} />
}
```

**Correct (early return prevents child computation):**

```tsx
const UserAvatar = memo(function UserAvatar({ userId }) {
  const avatarId = useMemo(() => computeAvatarId(userId), [userId])
  return <Avatar id={avatarId} />
})

function Profile({ userId, isLoading }) {
  if (isLoading) return <Skeleton />
  return <UserAvatar userId={userId} />
}
```

**Note:** If React Compiler is enabled, manual memoization with `memo()` and `useMemo()` is not necessary.

---
title: Subscribe to Derived State
impact: MEDIUM
impactDescription: reduces re-render frequency
tags: rerender, derived-state, responsive, optimization
---

## Subscribe to Derived State

Subscribe to derived boolean state rather than continuous values to minimize re-renders.

**Incorrect (re-renders on every pixel change):**

```tsx
function Component() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isMobile = width < 768
  return isMobile ? <MobileView /> : <DesktopView />
}
```

**Correct (re-renders only at breakpoint):**

```tsx
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

function Component() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  return isMobile ? <MobileView /> : <DesktopView />
}