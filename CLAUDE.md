## Workflow Preferences

- **Don't run `npm run build`** - Let me run it since it's faster and I can tell you to do other stuff while it's running.
- **Never run database commands** - Don't run any database commands (migrations, seeds, drizzle-kit, etc.) on your own. Just tell me what to run. If commands need to be sequential, tell me the order and I'll run them and paste errors or success from the terminal.

---

# 3D RENDERING SETUP (WORKING STATE - Jan 2026)

This documents the WORKING configuration for the 3D shelf renderer. DO NOT CHANGE without good reason.

## Panel.tsx - Edge Rendering

```tsx
<mesh position={safePosition} castShadow receiveShadow>
  <boxGeometry key={geoKey} args={safeSize} />
  <meshStandardMaterial
    color="#f5f5f5"
    roughness={0.85}
    metalness={0}
    polygonOffset
    polygonOffsetFactor={1}
    polygonOffsetUnits={1}
  />
  <Edges key={`e-${geoKey}`} threshold={15} color="#000000" />
</mesh>
```

**Why this works:**
- `polygonOffset` prevents Z-fighting where panels meet (pushes surfaces back in depth buffer)
- `threshold={15}` detects edges at >15° angle (permissive, shows inner edges)
- NO `scale` on Edges - causes double lines
- NO `depthTest={false}` - causes double lines everywhere

## Scene.tsx - Camera & Lighting

```tsx
<Canvas frameloop="demand" shadows dpr={[1, 1.75]}>
  <color attach="background" args={["#f0f0f0"]} />
  <ambientLight intensity={0.6} />
  <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
  {!showEdgesOnly && <Environment preset="apartment" />}

  <Bounds fit clip observe margin={1.5}>
    <Center>
      <Wardrobe ref={wardrobeRef} />
    </Center>
  </Bounds>

  <OrbitControls makeDefault enablePan enableZoom />
</Canvas>
```

**Why this works:**
- `Bounds` + `Center` auto-fits camera to model (no manual positioning)
- NO `ContactShadows` - causes artifacts at wrong Y position
- NO `Stage` - conflicts with Bounds
- `frameloop="demand"` - only renders when props change (performance)

## CarcassFrame.tsx - Simple Box Structure

One compartment "A" = 5 panels:
```
┌─────────────────────────┐
│         TOP             │  <- innerW × t × carcassD
├───┬───────────────┬─────┤
│   │               │     │
│ L │       A       │  R  │  <- Side panels: t × h × carcassD
│   │               │     │
├───┴───────────────┴─────┤
│        BOTTOM           │  <- innerW × t × carcassD
└─────────────────────────┘
        BACK PANEL           <- w × h × backT (behind everything)
```

**Key geometry:**
```typescript
const carcassD = d - backT;     // Carcass panels shortened to leave room for back
const carcassZ = backT / 2;      // Carcass panels shifted forward
// Back panel at: position=[0, 0, -d/2 + backT/2]
```

This creates a gap where back panel sits INSIDE the frame, edges visible from all angles.

## Drag Handles (WORKING - Jan 2026)

Both vertical seams and horizontal splits have draggable handles. **CONFIRMED WORKING.**

### SeamHandle.tsx - Vertical Seam Dragging (left/right)

```tsx
// Uses direct intersection X - no offset needed since parent has no X offset
const newX = Math.max(minX, Math.min(maxX, intersection.current.x));
setVerticalBoundary(seamIndex, newX);
```

**Why it works:**
- Drag plane at Z = depth/2 (facing camera)
- X coordinate from raycast is used directly (no parent X offset)
- Shows `<>` indicator for left/right dragging

### HorizontalSplitHandle.tsx - Horizontal Split Dragging (up/down)

**CRITICAL: Uses RELATIVE DRAGGING to avoid coordinate system issues!**

```tsx
// On pointer down - capture starting positions
startY.current = y;  // Current split Y
startMouseY.current = intersection.current.y;  // Mouse world Y at click

// On pointer move - apply delta
const deltaY = intersection.current.y - startMouseY.current;
const newY = Math.max(minY, Math.min(maxY, startY.current + deltaY));
setColumnHorizontalBoundary(columnIndex, newY);
```

**Why relative dragging is required:**
- Parent group (CarcassFrame) has Y offset of h/2
- Direct intersection.y is in WORLD coordinates
- Store values are in LOCAL coordinates
- Relative dragging avoids all conversion: just track the DELTA and apply to start position

**What NOT to do:**
- DON'T try to convert world Y to local Y with offsets - it's error-prone
- DON'T use absolute positioning from raycast - causes jumping on click

**Visual indicators:**
- SeamHandle: `<>` for horizontal movement
- HorizontalSplitHandle: `▲▼` for vertical movement

---

# WARDROBE BUSINESS LOGIC (COMPLETE REFERENCE)

This section documents ALL business rules for the 3D wardrobe configurator. Read this before making ANY changes.

---

## 1. Coordinate System

```
                      +Y (top)
                        │
                        │
         ───────────────┼───────────────► +X (right)
        -X (left)       │
                        │
                      -Y (bottom)

                    +Z (front, toward viewer)
                    -Z (back, away from viewer)
```

- **Origin (0, 0, 0)** is at the CENTER of the wardrobe
- **X axis**: left (-w/2) to right (+w/2)
- **Y axis**: bottom (-h/2) to top (+h/2)
- **Z axis**: back (-d/2) to front (+d/2)
- **ALL dimensions in METERS** (convert from cm: `cm / 100`)

---

## 2. Panel Thickness

```typescript
// Main material thickness (carcass panels)
const t = (material.thickness ?? 18) / 1000;  // Default 18mm = 0.018m

// Back panel thickness (separate material)
const backT = ((backMat?.thickness ?? 5) as number) / 1000;  // Default 5mm = 0.005m

// Door thickness
const doorT = 18 / 1000;  // 18mm = 0.018m
```

**CRITICAL: All panels have physical thickness!**
- Panels are NOT infinitely thin
- Position is at the CENTER of the panel
- Size is the FULL extent (including thickness)

Example: Side L panel at left edge:
```
Position X = -w/2 + t/2   (shifted INWARD by half thickness)
Size X = t                 (full thickness)
```

---

## 3. Panel Types (SINGLE vs DOUBLE)

### 3.1 SINGLE Panels (One Board)

**Side L** - Outer left panel (ONE board)
```
┌─┐
│ │  <- Single panel at left edge
│ │
│ │
└─┘
Position: [-w/2 + t/2, cy, 0]
Size: [t, h, d]
```

**Side R** - Outer right panel (ONE board)
```
                          ┌─┐
                          │ │  <- Single panel at right edge
                          │ │
                          │ │
                          └─┘
Position: [w/2 - t/2, cy, 0]
Size: [t, h, d]
```

**Top** - Horizontal panel at top (ONE board per column)
```
Position: [cx, h/2 - t/2, 0]
Size: [innerWidth, t, d]
```

**Bottom** - Horizontal panel at bottom (ONE board per column)
```
Position: [cx, -h/2 + baseH + t/2, 0]  // Raised by base height
Size: [innerWidth, t, d]
```

### 3.2 DOUBLE Panels (Two Boards Touching)

**Vertical Seams** - Internal dividers between columns

⚠️ **CRITICAL: Seams are TWO panels, not one!**

```
     Column A    │ │    Column B
                 │ │
     ────────────┤ ├────────────
                 │ │
                 │A│B│
                 │ │
     ────────────┤ ├────────────
                 │ │

Seam A: Position [x - t/2, cy, 0], Size [t, seamH, d]
Seam B: Position [x + t/2, cy, 0], Size [t, seamH, d]
```

**Why two panels?**
- Realistic furniture construction (two boards meet at seam)
- Each column "owns" its own side panel
- Enables accurate cutting lists and material calculations

### 3.3 Top/Bottom at Horizontal Split (DOUBLE)

When a column has a horizontal split (h > 200cm):
```
      ┌─────────────────┐
      │   Top (upper)   │
      ├─────────────────┤  <- Top compartment
      │                 │
      ├─────────────────┤  <- These are TWO panels (touching)
      │   Top (lower)   │     └─ Bottom of upper compartment
      ├─────────────────┤     └─ Top of lower compartment
      │                 │
      ├─────────────────┤  <- Bottom compartment
      │  Bottom (lower) │
      └─────────────────┘
```

---

## 4. Wardrobe Structure

### 4.1 Columns (Vertical Divisions)

Columns are created by `verticalBoundaries: number[]` in the store.

```typescript
// Example: 2 columns (1 seam at center)
verticalBoundaries = [0]  // One seam at X=0 (center)

// Example: 3 columns (2 seams)
verticalBoundaries = [-0.33, 0.33]  // Two seams

// buildBlocksX(w, boundaries) returns:
[
  { start: -w/2, end: boundaries[0], width: ... },  // Column 0
  { start: boundaries[0], end: boundaries[1], width: ... },  // Column 1
  { start: boundaries[1], end: w/2, width: ... },  // Column 2
]
```

**Constraints:**
- `MIN_SEGMENT = 0.1m` (10cm minimum column width)
- `MAX_SEGMENT_X = 1.0m` (100cm maximum column width)

### 4.2 Horizontal Splits (Per-Column)

Each column can have an independent horizontal split via `columnHorizontalBoundaries`.

```typescript
// Example: Column 0 split at 180cm, Column 1 no split
columnHorizontalBoundaries = {
  0: 0.80,  // Y position in meters (from center, so 0.80 = 180cm from bottom if h=2m)
  // Column 1 not in object = no split (or use null)
}
```

**When is horizontal split available?**
- Only when `h > TARGET_BOTTOM_HEIGHT` (200cm)

**Module labels:**
- `SingleModule` - No split (h ≤ 200cm)
- `BottomModule` - Lower compartment when split
- `TopModule` - Upper compartment when split

---

## 5. Base (Plinth/Baza)

```typescript
hasBase: boolean     // Whether base exists
baseHeight: number   // Height in CM (minimum 3cm)
baseH = baseHeight / 100  // Convert to meters
```

**What base affects:**

1. **Bottom panels** - Y position raised by `baseH`
   ```typescript
   yBottom = -h/2 + baseH + t/2
   ```

2. **Vertical seams** - Height reduced, Y shifted up
   ```typescript
   const seamH = fullHeight - baseH;  // Shorter
   const seamY = (-h/2 + baseH + h/2) / 2;  // Centered above base
   ```

3. **Side L and Side R** - Go to FLOOR (not affected by base)
   ```
   Side panels extend full height, base is empty space between them
   ```

**Visual:**
```
┌───────────────────────────────┐
│ Side L                Side R  │
│   │                      │    │
│   │    [compartments]    │    │
│   │                      │    │
│   ├──────────────────────┤    │  <- Bottom panel (raised)
│   │                      │    │
│   │      BASE SPACE      │    │  <- Empty when hasBase=true
│   │     (no panels)      │    │
└───┴──────────────────────┴────┘  <- Floor (Y = -h/2)
```

---

## 6. Back Panels

```typescript
const backT = 5 / 1000;  // 5mm thickness
const clearance = 2 / 1000;  // 2mm clearance

// Position: behind carcass
const z = -d/2 - backT/2;

// Size: element size minus clearance
const backW = elemW - clearance;
const backH = elemH - clearance;
```

**One back panel per element (compartment).**

---

## 7. Doors

```typescript
const doorT = 18 / 1000;  // 18mm
const clearance = 1 / 1000;  // 1mm overall
const doubleGap = 3 / 1000;  // 3mm gap between double doors

// Position: in front of carcass
const zFront = d/2 + doorT/2 + 0.0005;  // Slight offset to avoid z-fighting
```

**Door types:**
- `none` - No door
- `left` - Single door, hinges left
- `right` - Single door, hinges right
- `double` - Two doors meeting in middle
- `leftMirror`, `rightMirror`, `doubleMirror` - With mirror finish
- `drawerStyle` - Drawer-front style

**Double door calculation:**
```typescript
const totalAvailW = elemW - clearance;
const leafW = (totalAvailW - doubleGap) / 2;
const offset = (leafW + doubleGap) / 2;

// Left leaf
position: [cx - offset, cy, zFront]
// Right leaf
position: [cx + offset, cy, zFront]
```

---

## 8. Compartment Extras

Each compartment (element A, B, C...) can have extras:

```typescript
compartmentExtras: {
  "A": {
    verticalDivider: boolean,  // Center divider
    drawers: boolean,          // Drawer stack
    drawersCount: number,      // How many drawers
    rod: boolean,              // Clothing rod
    led: boolean,              // LED lighting
  }
}
```

### 8.1 Drawers

```typescript
const DRAWER_HEIGHT = 0.10;  // 10cm
const DRAWER_GAP = 0.01;     // 1cm gap between drawers

// Drawers stack from bottom up
for (let i = 0; i < count; i++) {
  const y = yStartInner + DRAWER_HEIGHT/2 + i * (DRAWER_HEIGHT + DRAWER_GAP);
  // ...
}

// Auto-shelf above drawers if space remains
if (usedCount < maxCount && remaining >= t) {
  // Add shelf above drawers
}
```

### 8.2 Clothing Rod

```typescript
const rodY = yEndInner - 0.10;  // 10cm below top
const radius = 0.03 / 2;        // 3cm diameter

<cylinderGeometry args={[radius, radius, innerW, 16]} />
```

### 8.3 Vertical Divider

Center divider within compartment, shortened if drawers exist.

---

## 9. Element Labeling (A, B, C...)

Elements are labeled bottom-to-top, left-to-right:

```
┌─────┬─────┬─────┐
│  D  │  E  │  F  │  <- Top row (if split)
├─────┼─────┼─────┤
│  A  │  B  │  C  │  <- Bottom row
└─────┴─────┴─────┘
```

```typescript
function toLetters(num: number): string {
  // 0 -> "A", 25 -> "Z", 26 -> "AA"
  let n = num + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
```

---

## 10. Store State (Key Fields)

```typescript
// Dimensions (in CM, convert to meters for 3D)
width: number           // Total width in cm
height: number          // Total height in cm
depth: number           // Total depth in cm

// Boundaries
verticalBoundaries: number[]  // X positions of seams (in METERS)
columnHorizontalBoundaries: Record<number, number | null>  // Per-column Y splits

// Base
hasBase: boolean
baseHeight: number      // In cm

// Materials
selectedMaterialId: string
selectedFrontMaterialId: string
selectedBackMaterialId: string

// Per-element configs
elementConfigs: Record<string, { columns: number, rowCounts: number[] }>
compartmentExtras: Record<string, CompartmentExtras>
doorSelections: Record<string, DoorType>

// UI state
isDragging: boolean     // Disables OrbitControls during drag
```

---

## 11. Serialization (Save/Load)

`src/lib/serializeWardrobe.ts` handles save/load for:
- Database storage
- PDF generation
- CSV export
- Design modals

**Always include:**
```typescript
getWardrobeSnapshot() => {
  width, height, depth,
  panelThickness,
  selectedMaterialId, selectedFrontMaterialId, selectedBackMaterialId,
  elementConfigs, compartmentExtras, doorSelections,
  hasBase, baseHeight,
  verticalBoundaries,
  columnHorizontalBoundaries,
}
```

---

## 12. Scene Invalidation

When store values change, call `invalidate()` in ContextMonitor:

```typescript
useEffect(() => {
  invalidate();
}, [
  store.width,
  store.height,
  store.depth,
  store.verticalBoundaries,
  store.columnHorizontalBoundaries,
  store.hasBase,
  // ... all other visual state
  invalidate,
]);
```

**If you add a new store value that affects rendering, ADD IT HERE!**

---

## 13. Constants Reference

```typescript
// src/components/CarcassFrame/constants.ts
MIN_SEGMENT = 0.1          // 10cm min segment
MAX_SEGMENT_X = 1.0        // 100cm max column width
MIN_TOP_HEIGHT = 0.1       // 10cm min compartment height
TARGET_BOTTOM_HEIGHT = 2.0 // 200cm split threshold
MIN_DRAG_GAP = 0.05        // 5cm min drag gap
DRAWER_HEIGHT = 0.10       // 10cm drawer height
DRAWER_GAP = 0.01          // 1cm drawer gap
```

---

## 14. Target Architecture (SIMPLE)

```
          │       │       │
          │   D   │   E   │   F     <- Top compartments
          │       │       │
     ─────┼───────┤       ├─────    <- Horizontal splits PER COLUMN
          │       │       │
          │   A   │   B   │   C     <- Bottom compartments
          │       │       │
          ▲       ▲       ▲
    Vertical seams span FULL HEIGHT (ONE array for entire wardrobe)
```

**Data model:**
- `verticalBoundaries: number[]` - ONE array, seams span full height
- `columnHorizontalBoundaries: Record<number, number | null>` - per-column Y splits

**NO per-module vertical boundaries!** Vertical seams are the same for all modules.

---

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