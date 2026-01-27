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

## 15. BlueprintView (2D Technical Drawing / Tehnički Crtež)

**CRITICAL: Store coordinates are FLOOR-ORIGIN meters (Y=0 at floor)**

CarcassFrame and BlueprintView BOTH use floor-origin. Do NOT add `h/2` to convert!

```typescript
// CORRECT - store values are floor-origin meters
const shelfYCm = shelfY * 100;  // Just convert m → cm

// WRONG - this adds half height, shifts everything UP
const shelfYCm = (shelfY + h/2) * 100;  // DON'T DO THIS
```

**Data sources (all floor-origin meters):**
- `columnHorizontalBoundaries[colIdx]` - shelf Y positions in bottom module
- `columnModuleBoundaries[colIdx]` - Y where module splits (for h > 200cm)
- `columnTopModuleShelves[colIdx]` - shelf Y positions in top module

**Validation required - boundaries can be INVALID after height resize:**
```typescript
const moduleBoundaryYCm = moduleBoundary * 100;
const isValid = moduleBoundaryYCm > innerBottom + tCm
             && moduleBoundaryYCm < innerTop - tCm;
// Skip rendering if invalid!
```

**Compartment calculation:**
- N shelves in bottom module → N+1 compartments
- If valid module boundary exists AND h > 200cm → add top module compartments
- Filter shelves: must be within `[innerBottom, moduleBoundaryY or innerTop]`

**mapY function converts floor-origin cm to SVG top-origin:**
```typescript
const mapY = (yFromFloorCm) => frontViewY + scaledHeight - yFromFloorCm * scale;
```

**Debug logging enabled** - check console for `[BlueprintView]` messages showing:
- Store data at render start
- Per-column compartment breakdown
- Module boundary validation (valid/INVALID warnings)

---

## 16. Flexbox min-w-0 Fix

Flex children have implicit `min-width: auto` - breaks `overflow-x-auto`.

```tsx
// WRONG - table expands parent
<div className="overflow-x-auto">
  <table className="min-w-[520px]">...</table>
</div>

// CORRECT - add min-w-0 to flex children
<form className="min-w-0">
  <div className="overflow-x-auto min-w-0">
    <table className="min-w-[520px]">...</table>
  </div>
</form>
```

---

## 17. useEffect Dependencies

Use primitives, not objects:

```tsx
// WRONG - re-runs on any user field change
useEffect(() => { ... }, [user])

// CORRECT - re-runs only when id changes
useEffect(() => { ... }, [user.id])

// BETTER - derived state for breakpoints
const isMobile = width < 768
useEffect(() => { ... }, [isMobile])  // not [width]
```

---

## 18. Derived State for Re-renders

Subscribe to derived boolean, not continuous value:

```tsx
// WRONG - re-renders every pixel
const [width, setWidth] = useState(window.innerWidth)
const isMobile = width < 768

// CORRECT - re-renders only at breakpoint
const isMobile = useMediaQuery('(max-width: 767px)')
```

---

## 19. Selection Border Lines (Step 5 Door Selection)

**CRITICAL: Use KEY-BASED neighbor detection, NOT Y-coordinate comparison!**

When showing dashed borders around selected compartments in Step 5, adjacent selected compartments should merge their borders (hide internal lines). The WRONG approach is to pre-compute Y-coordinates in a useMemo and compare them - this causes calculation mismatches between the pre-computed bounds and render-time bounds.

### The Problem with Y-Coordinate Approach

```tsx
// WRONG - causes calculation mismatches!
const selectedBoundsMap = useMemo(() => {
  // Pre-compute bounds for all selected compartments
  // These often DON'T match the actual render-time bounds
}, [deps]);

const checkNeighbors = (myKey) => {
  // Compare Y-coordinates with tolerance
  if (Math.abs(otherBounds.top - myBounds.bottom) < 0.002) { ... }
};
```

This approach fails because:
- Bounds calculated in useMemo vs render loop can differ slightly
- Floating-point comparison is unreliable even with tolerance
- Complex calculation logic is duplicated and error-prone

### The Correct KEY-BASED Approach

```tsx
// CORRECT - use compartment keys directly!

// For sub-compartments (A2.0.3):
const neighborAboveKey = `${compKey}.${secIdx}.${spaceIdx + 1}`;  // A2.0.4
const neighborBelowKey = `${compKey}.${secIdx}.${spaceIdx - 1}`;  // A2.0.2
let hasNeighborAbove = selectedDoorCompartments.includes(neighborAboveKey);
let hasNeighborBelow = selectedDoorCompartments.includes(neighborBelowKey);

// For TOPMOST sub-compartment, also check main compartment ABOVE
if (spaceIdx === shelfCount) {
  const compAboveKey = `${colLetter}${compNum + 1}`;
  if (selectedDoorCompartments.includes(compAboveKey)) {
    hasNeighborAbove = true;
  }
}

// For BOTTOMMOST sub-compartment, also check main compartment BELOW
if (spaceIdx === 0 && compNum > 1) {
  const compBelowKey = `${colLetter}${compNum - 1}`;
  if (selectedDoorCompartments.includes(compBelowKey)) {
    hasNeighborBelow = true;
  }
}
```

### Key Naming Convention

- Main compartment: `A1`, `A2`, `B1`, etc. (column letter + compartment number)
- Sub-compartment: `A2.0.3` (compKey.sectionIdx.spaceIdx)
  - `compKey` = parent compartment (e.g., "A2")
  - `sectionIdx` = vertical section (0 for single column)
  - `spaceIdx` = space index from bottom (0 = bottom, shelfCount = top)

### Why Key-Based Works

1. **Keys are exact strings** - no floating-point comparison issues
2. **Compartment relationships are structural** - A2.0.4 is ALWAYS above A2.0.3
3. **No duplicate calculations** - use the keys that already exist
4. **Simple logic** - just check if adjacent key is in selection array

### Files

- `src/components/CarcassFrame/SelectionBorderLines.tsx` - Dashed border component
- `src/components/CarcassFrame/CarcassFrame.tsx` - Border rendering in Step 5