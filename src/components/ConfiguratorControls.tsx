"use client";

import jsPDF from "jspdf";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  DoorClosed,
  DoorOpen,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  LogOut,
  Save,
  Settings,
  ShoppingCart,
  Table,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { signOut, useSession } from "@/lib/auth-client";
import { captureThumbnail } from "@/lib/captureThumbnail";
import { calculateCutList } from "@/lib/calcCutList";
import { getWardrobeSnapshot } from "@/lib/serializeWardrobe";
import {
  useShelfStore,
  parseSubCompKey,
  type Material,
  type ShelfState,
} from "@/lib/store";
import {
  toLetters,
  buildBlocksX,
  buildModulesY,
  getElementKeys,
  getCompartmentKeys,
} from "@/lib/wardrobe-utils";
import {
  DRAWER_HEIGHT,
  DRAWER_GAP,
  DRAWER_HEIGHT_CM,
  DRAWER_GAP_CM,
  MAX_SEGMENT_X_CM,
  TARGET_BOTTOM_HEIGHT_CM,
  MIN_TOP_HEIGHT_CM,
} from "@/lib/wardrobe-constants";
import { AuthForms } from "./AuthForms";
import { CheckoutDialog } from "./CheckoutDialog";
import { CompartmentExtrasPanel } from "./CompartmentExtrasPanel";
import { CompartmentSchematic } from "./CompartmentSchematic";
import { DimensionControl } from "./DimensionControl";
import { DoorOptionsPanel } from "./DoorOptionsPanel";
import { MaterialPickerModal } from "./MaterialPickerModal";
import { Button } from "./ui/button";

// Helper function to get initials from name/email
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface InitialSession {
  user: SessionUser;
}

export function ConfiguratorControls({
  wardrobeRef,
  initialSession,
  materials,
  isAdmin = false,
}: {
  wardrobeRef: React.RefObject<any>;
  initialSession?: InitialSession | null;
  materials: Material[];
  isAdmin?: boolean;
}) {
  // Auth state - use initialSession from server, useSession for reactivity after login/logout
  const { data: clientSession, isPending } = useSession();
  // Use initialSession while client is loading, then switch to client session (even if null after logout)
  const session = isPending ? initialSession : clientSession;
  const router = useRouter();
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = React.useState(false);
  const [wardrobeName, setWardrobeName] = React.useState("Orman");
  const [saveAsModel, setSaveAsModel] = React.useState(false);
  const [saveMode, setSaveMode] = React.useState<"new" | "update">("new");
  const [openMaterialCategory, setOpenMaterialCategory] = React.useState<
    string | null
  >(null);

  // Handle login click - save state before opening auth
  const handleLoginClick = () => {
    const currentState = getWardrobeSnapshot();
    localStorage.setItem("pendingWardrobeState", JSON.stringify(currentState));
    setAuthDialogOpen(true);
  };

  // Handle save wardrobe click
  const handleSaveClick = () => {
    if (!session) {
      // Not logged in - show alert dialog
      setLoginAlertOpen(true);
      return;
    }

    // Logged in - show save dialog
    setWardrobeName("Orman");
    setSaveAsModel(false);
    // Force "update" when editing from order context, otherwise default based on admin/loaded state
    if (fromOrderId && loadedWardrobeId) {
      setSaveMode("update");
    } else {
      setSaveMode(isAdmin && loadedWardrobeId ? "update" : "new");
    }
    setSaveDialogOpen(true);
  };

  // Perform actual save
  const performSave = async () => {
    if (!wardrobeName.trim()) {
      toast.error("Molimo unesite naziv ormana");
      return;
    }

    try {
      const snapshot = getWardrobeSnapshot();
      if (!snapshot || typeof snapshot !== "object") {
        console.error("[performSave] invalid snapshot", snapshot);
        toast.error("Greška pri čuvanju ormana");
        return;
      }

      // Capture thumbnail from canvas
      let thumbnail: string | null = null;
      const canvas = document.querySelector("canvas");
      if (canvas) {
        try {
          thumbnail = await captureThumbnail(canvas);
        } catch (e) {
          console.error("[performSave] Failed to capture thumbnail", e);
          // Continue without thumbnail
        }
      }

      // Handle update mode for existing wardrobes/models
      if (saveMode === "update" && loadedWardrobeId) {
        const res = await fetch(`/api/wardrobes/${loadedWardrobeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: wardrobeName,
            data: snapshot,
            thumbnail,
          }),
        });

        if (!res.ok) {
          console.error("[performSave] update failed", res.status);
          toast.error("Greška pri ažuriranju ormana");
          return;
        }

        // Mark as saved for unsaved changes detection
        useShelfStore.getState().setLastSavedSnapshot(snapshot);

        // Show appropriate success message
        if (fromOrderId && fromOrderNumber) {
          toast.success(`Orman za porudžbinu #${fromOrderNumber} je ažuriran`);
          // Don't clear order context - keep "back to order" button visible
        } else {
          toast.success(
            `${loadedWardrobeIsModel ? "Model" : "Orman"} "${wardrobeName}" je ažuriran`,
          );
        }
        setSaveDialogOpen(false);
        return;
      }

      // Create new wardrobe/model
      const res = await fetch("/api/wardrobes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wardrobeName,
          data: snapshot,
          thumbnail,
          isModel: saveAsModel,
        }),
      });

      if (!res.ok) {
        console.error("[performSave] save failed", res.status);
        toast.error("Greška pri čuvanju ormana");
        return;
      }

      // Clear loaded wardrobe since we created a new one
      clearLoadedWardrobe();

      // Mark as saved for unsaved changes detection
      useShelfStore.getState().setLastSavedSnapshot(snapshot);

      toast.success(`"${wardrobeName}" je sačuvan`, {
        action: {
          label: "Pogledaj",
          onClick: () => router.push("/wardrobes"),
        },
      });
      setSaveDialogOpen(false);
    } catch (e) {
      console.error("[performSave] exception", e);
      toast.error("Greška pri čuvanju ormana");
    }
  };

  // Handle order click
  const [checkoutThumbnail, setCheckoutThumbnail] = React.useState<
    string | null
  >(null);
  const handleOrderClick = async () => {
    // Validate that korpus material is selected and exists
    if (!selectedMaterialId) {
      toast.error(
        "Molimo izaberite materijal za korpus u sekciji 'Materijali'",
      );
      return;
    }
    const korpusMaterial = materials.find(
      (m) => String(m.id) === String(selectedMaterialId),
    );
    if (!korpusMaterial) {
      toast.error(
        "Izabrani materijal za korpus nije pronađen. Molimo izaberite ponovo.",
      );
      return;
    }

    // Validate that front material is selected and exists
    if (!selectedFrontMaterialId) {
      toast.error(
        "Molimo izaberite materijal za lica/vrata u sekciji 'Materijali'",
      );
      return;
    }
    const frontMaterial = materials.find(
      (m) => String(m.id) === String(selectedFrontMaterialId),
    );
    if (!frontMaterial) {
      toast.error(
        "Izabrani materijal za lica/vrata nije pronađen. Molimo izaberite ponovo.",
      );
      return;
    }

    // Capture thumbnail before opening dialog
    let thumbnail: string | null = null;
    const canvas = document.querySelector("canvas");
    if (canvas) {
      try {
        thumbnail = await captureThumbnail(canvas);
      } catch (e) {
        console.error("Failed to capture thumbnail for order", e);
      }
    }
    setCheckoutThumbnail(thumbnail);

    // Open checkout dialog
    setCheckoutDialogOpen(true);
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    toast.success("Odjavljeni ste");
  };

  // Download 2D front view as JPG
  const setViewMode = useShelfStore((state: ShelfState) => state.setViewMode);
  const viewMode = useShelfStore((state: ShelfState) => state.viewMode);
  // For backward compatibility with existing camera mode logic
  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
  const setCameraMode = (mode: "2D" | "3D") => setViewMode(mode);
  const setShowEdgesOnly = useShelfStore(
    (state: ShelfState) => state.setShowEdgesOnly,
  );
  const _showEdgesOnly = useShelfStore(
    (state: ShelfState) => state.showEdgesOnly,
  );

  // Download front edges only as JPG
  const handleDownloadFrontEdges = React.useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;

    // 1. Set edges mode (HIDE dimension lines for clean edges)
    useShelfStore.getState().setShowDimensions(false);
    setShowEdgesOnly(true);

    // 2. Wait for edges mode to apply
    await new Promise((resolve) => setTimeout(resolve, 100));
    await new Promise(requestAnimationFrame);

    // 3. Force camera to exact front view (Y=0, looking straight at center)
    useShelfStore.getState().triggerForceFrontView();

    // 4. Wait for camera and render to complete
    await new Promise((resolve) => setTimeout(resolve, 200));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const canvas = document.querySelector("canvas");
    if (!canvas) {
      setShowEdgesOnly(false);
      useShelfStore.getState().setShowDimensions(prevDims);
      return;
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "wardrobe-front-edges.jpg";
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [setShowEdgesOnly]);

  const handleDownloadFrontView = React.useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;

    // 1. Set dimensions and 2D view
    useShelfStore.getState().setShowDimensions(true);
    if (cameraMode !== "2D") {
      setCameraMode("2D");
    }

    // 2. Wait for mode change to apply
    await new Promise((resolve) => setTimeout(resolve, 100));
    await new Promise(requestAnimationFrame);

    // 3. Trigger fit to view after mode is set
    useShelfStore.getState().triggerFitToView();

    // 4. Wait for camera fit animation to complete (Bounds animation)
    await new Promise((resolve) => setTimeout(resolve, 600));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const canvas = document.querySelector("canvas");
    if (!canvas) {
      useShelfStore.getState().setShowDimensions(prevDims);
      return;
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "wardrobe-front-view.jpg";
    link.click();
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode]);

  // Download 2D technical drawing - exports the engineering-style SVG from BlueprintView
  const handleDownloadTechnical2D = React.useCallback(async () => {
    const prevViewMode = useShelfStore.getState().viewMode;

    // Switch to Sizing view mode which shows the BlueprintView SVG
    useShelfStore.getState().setViewMode("Sizing");

    // Wait for the view to render
    await new Promise((resolve) => setTimeout(resolve, 300));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    // Find the SVG element from BlueprintView by its id
    const svgElement = document.querySelector("#blueprint-technical-drawing");
    if (!svgElement) {
      console.error("SVG element not found");
      useShelfStore.getState().setViewMode(prevViewMode);
      return;
    }

    // Clone SVG and prepare for export
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

    // Get the viewBox dimensions
    const viewBox = svgClone.getAttribute("viewBox") || "0 0 1000 700";
    const [, , vbWidth, vbHeight] = viewBox.split(" ").map(Number);

    // Set explicit dimensions for the export
    svgClone.setAttribute("width", String(vbWidth * 2));
    svgClone.setAttribute("height", String(vbHeight * 2));
    svgClone.style.backgroundColor = "white";

    // Serialize SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create an image from SVG and convert to PNG for better compatibility
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = vbWidth * 2;
      canvas.height = vbHeight * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Download as PNG
        const pngUrl = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "tehnicki-crtez-2d.png";
        link.click();
      }
      URL.revokeObjectURL(svgUrl);

      // Restore previous view mode
      useShelfStore.getState().setViewMode(prevViewMode);
    };
    img.onerror = () => {
      console.error("Failed to load SVG as image");
      URL.revokeObjectURL(svgUrl);
      useShelfStore.getState().setViewMode(prevViewMode);
    };
    img.src = svgUrl;
  }, []);

  const {
    width,
    height,
    depth,
    setWidth,
    setHeight,
    setDepth,
    numberOfColumns,
  } = useShelfStore();

  // Add these if not already in your store:
  const selectedMaterialId = useShelfStore(
    (state: ShelfState) => state.selectedMaterialId,
  );
  const setSelectedMaterialId = useShelfStore(
    (state: ShelfState) => state.setSelectedMaterialId,
  );
  const selectedFrontMaterialId = useShelfStore(
    (state: ShelfState) => state.selectedFrontMaterialId,
  );
  const setSelectedFrontMaterialId = useShelfStore(
    (state: ShelfState) => state.setSelectedFrontMaterialId,
  );
  const selectedBackMaterialId = useShelfStore(
    (state: ShelfState) => state.selectedBackMaterialId,
  );
  const setSelectedBackMaterialId = useShelfStore(
    (state: ShelfState) => state.setSelectedBackMaterialId,
  );

  // Auto-select first material for each category type if current selection is invalid
  React.useEffect(() => {
    // Group materials by category type
    const korpusMaterials = materials.filter((m) =>
      m.categories.some(
        (c) =>
          !c.toLowerCase().includes("leđa") &&
          !c.toLowerCase().includes("ledja") &&
          !c.toLowerCase().includes("lica") &&
          !c.toLowerCase().includes("vrata"),
      ),
    );
    const frontMaterials = materials.filter((m) =>
      m.categories.some(
        (c) =>
          c.toLowerCase().includes("lica") || c.toLowerCase().includes("vrata"),
      ),
    );
    const backMaterials = materials.filter((m) =>
      m.categories.some(
        (c) =>
          c.toLowerCase().includes("leđa") || c.toLowerCase().includes("ledja"),
      ),
    );

    // Validate korpus selection
    if (
      !selectedMaterialId ||
      !korpusMaterials.some((m) => m.id === selectedMaterialId)
    ) {
      if (korpusMaterials.length > 0) {
        setSelectedMaterialId(korpusMaterials[0].id);
      }
    }

    // Validate front selection
    if (
      !selectedFrontMaterialId ||
      !frontMaterials.some((m) => m.id === selectedFrontMaterialId)
    ) {
      if (frontMaterials.length > 0) {
        setSelectedFrontMaterialId(frontMaterials[0].id);
      }
    }

    // Validate back selection
    if (
      !selectedBackMaterialId ||
      !backMaterials.some((m) => m.id === selectedBackMaterialId)
    ) {
      if (backMaterials.length > 0) {
        setSelectedBackMaterialId(backMaterials[0].id);
      }
    }
  }, [
    materials,
    selectedMaterialId,
    selectedFrontMaterialId,
    selectedBackMaterialId,
    setSelectedMaterialId,
    setSelectedFrontMaterialId,
    setSelectedBackMaterialId,
  ]);

  const showDimensions = useShelfStore(
    (state: ShelfState) => state.showDimensions,
  );
  const setShowDimensions = useShelfStore(
    (state: ShelfState) => state.setShowDimensions,
  );
  // Base (baza) state
  const hasBase = useShelfStore((state: ShelfState) => state.hasBase);
  const baseHeight = useShelfStore((state: ShelfState) => state.baseHeight);
  const setHasBase = useShelfStore((state: ShelfState) => state.setHasBase);
  const setBaseHeight = useShelfStore(
    (state: ShelfState) => state.setBaseHeight,
  );

  // Accordion step state (for controlled accordion)
  const activeAccordionStep = useShelfStore(
    (state: ShelfState) => state.activeAccordionStep,
  );
  const setActiveAccordionStep = useShelfStore(
    (state: ShelfState) => state.setActiveAccordionStep,
  );
  const selectedCompartmentKey = useShelfStore(
    (state: ShelfState) => state.selectedCompartmentKey,
  );

  // State for cut list modal
  const [showCutList, setShowCutList] = React.useState(false);

  // Track loaded wardrobe for update functionality
  const loadedWardrobeId = useShelfStore(
    (state: ShelfState) => state.loadedWardrobeId,
  );
  const loadedWardrobeIsModel = useShelfStore(
    (state: ShelfState) => state.loadedWardrobeIsModel,
  );
  const clearLoadedWardrobe = useShelfStore(
    (state: ShelfState) => state.clearLoadedWardrobe,
  );

  // Track order context when editing from order detail page
  const fromOrderId = useShelfStore((state: ShelfState) => state.fromOrderId);
  const fromOrderNumber = useShelfStore(
    (state: ShelfState) => state.fromOrderNumber,
  );
  const clearFromOrder = useShelfStore(
    (state: ShelfState) => state.clearFromOrder,
  );

  // Track which material should be pinned to first position per category type
  // Only updated when selecting from popup, not when clicking preview images
  const [pinnedMaterialIds, setPinnedMaterialIds] = React.useState<{
    korpus?: number;
    front?: number;
    back?: number;
  }>({});

  // Additional store reads needed for cut list (top-level to respect Rules of Hooks)
  const elementConfigs = useShelfStore(
    (state: ShelfState) => state.elementConfigs,
  );
  const compartmentExtras = useShelfStore(
    (state: ShelfState) => state.compartmentExtras,
  );
  const doorSelections = useShelfStore(
    (state: ShelfState) => state.doorSelections,
  );
  const doorGroups = useShelfStore((state: ShelfState) => state.doorGroups);
  // Handle settings for cut list pricing
  const globalHandleId = useShelfStore(
    (state: ShelfState) => state.globalHandleId,
  );
  const globalHandleFinish = useShelfStore(
    (state: ShelfState) => state.globalHandleFinish,
  );
  const storeHandles = useShelfStore((state: ShelfState) => state.handles);
  const doorSettingsMode = useShelfStore(
    (state: ShelfState) => state.doorSettingsMode,
  );
  const showDoors = useShelfStore((state: ShelfState) => state.showDoors);
  const setShowDoors = useShelfStore((state: ShelfState) => state.setShowDoors);
  // Door multi-select state for Step 5
  const selectedDoorCompartments = useShelfStore(
    (state: ShelfState) => state.selectedDoorCompartments,
  );
  // Structural boundaries - CRITICAL for accurate area calculation
  const verticalBoundaries = useShelfStore(
    (state: ShelfState) => state.verticalBoundaries,
  );
  const columnHorizontalBoundaries = useShelfStore(
    (state: ShelfState) => state.columnHorizontalBoundaries,
  );
  const columnModuleBoundaries = useShelfStore(
    (state: ShelfState) => state.columnModuleBoundaries,
  );
  const columnHeights = useShelfStore(
    (state: ShelfState) => state.columnHeights,
  );
  const columnTopModuleShelves = useShelfStore(
    (state: ShelfState) => state.columnTopModuleShelves,
  );

  // Precompute cut list using top-level values to avoid hooks inside conditional modal
  const cutList = React.useMemo(
    () =>
      calculateCutList(
        {
          width,
          height,
          depth,
          selectedMaterialId,
          selectedFrontMaterialId,
          selectedBackMaterialId,
          elementConfigs,
          compartmentExtras,
          doorSelections,
          hasBase,
          baseHeight,
          // Structural boundaries for accurate calculation
          verticalBoundaries,
          columnHorizontalBoundaries,
          columnModuleBoundaries,
          // Door groups and handle settings for pricing
          doorGroups,
          globalHandleId,
          globalHandleFinish,
          doorSettingsMode,
        },
        materials,
        storeHandles,
      ),
    [
      width,
      height,
      depth,
      selectedMaterialId,
      selectedFrontMaterialId,
      selectedBackMaterialId,
      elementConfigs,
      compartmentExtras,
      doorSelections,
      hasBase,
      baseHeight,
      materials,
      storeHandles,
      // Structural boundaries
      verticalBoundaries,
      columnHorizontalBoundaries,
      columnModuleBoundaries,
      // Door groups and handle settings
      doorGroups,
      globalHandleId,
      globalHandleFinish,
      doorSettingsMode,
    ],
  );

  // Number formatter: 2 decimals consistently
  const fmt2 = React.useCallback(
    (n: number) =>
      Number(n ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  // Export per-element specification to PDF
  const handleExportElementSpecs = React.useCallback(() => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const _pageW = 210;
      const pageH = 297;
      const margin = 12;
      const baseFont = 11;

      // Sizing helpers from store
      const widthCm = useShelfStore.getState().width; // cm
      const heightCm = useShelfStore.getState().height; // cm
      const hasBase = useShelfStore.getState().hasBase;
      const baseHeight = useShelfStore.getState().baseHeight; // cm
      const nBlocksX = Math.max(1, Math.ceil(widthCm / MAX_SEGMENT_X_CM));
      const hasSplitY = heightCm > TARGET_BOTTOM_HEIGHT_CM;
      let bottomModuleCm = Math.min(TARGET_BOTTOM_HEIGHT_CM, heightCm);
      const topModuleCm = hasSplitY
        ? Math.max(MIN_TOP_HEIGHT_CM, heightCm - TARGET_BOTTOM_HEIGHT_CM)
        : 0;
      if (hasSplitY && heightCm - TARGET_BOTTOM_HEIGHT_CM < MIN_TOP_HEIGHT_CM) {
        // Adjust bottom if top had to be enlarged
        bottomModuleCm = heightCm - topModuleCm;
      }
      const nModulesY = hasSplitY ? 2 : 1;

      // Precompute block widths in cm (match BlueprintView: equal division across blocks)
      const equalBlockW = widthCm / nBlocksX;
      const blockWidthsCm: number[] = Array.from(
        { length: nBlocksX },
        () => equalBlockW,
      );

      // Letter index helpers (A..Z..AA..)
      const fromLetters = (s: string) => {
        let n = 0;
        for (let i = 0; i < s.length; i++) {
          n = n * 26 + (s.charCodeAt(i) - 64);
        }
        return n - 1; // zero-based
      };

      const getElementDimsCm = (letter: string) => {
        const idx = fromLetters(letter);
        const rowIdx = Math.floor(idx / nBlocksX); // 0 bottom, 1 top if split
        const colIdx = idx % nBlocksX;
        const wCm = blockWidthsCm[colIdx] ?? widthCm; // fallback to total
        const hCm =
          nModulesY === 1
            ? heightCm
            : rowIdx === 0
              ? bottomModuleCm
              : topModuleCm;
        return { wCm, hCm, rowIdx, colIdx };
      };

      // Draw helpers: dimension lines
      const drawDimH = (
        x1: number,
        y: number,
        x2: number,
        label: string,
        options?: { arrows?: boolean; ext?: number; font?: number },
      ) => {
        const ext = options?.ext ?? 3;
        const font = options?.font ?? 9;
        // extension lines
        doc.line(x1, y - ext, x1, y + ext);
        doc.line(x2, y - ext, x2, y + ext);
        // main dim line
        doc.line(x1, y, x2, y);
        // arrows (simple V)
        if (options?.arrows !== false) {
          doc.line(x1, y, x1 + 1.8, y - 1.2);
          doc.line(x1, y, x1 + 1.8, y + 1.2);
          doc.line(x2, y, x2 - 1.8, y - 1.2);
          doc.line(x2, y, x2 - 1.8, y + 1.2);
        }
        // label centered
        const cx = (x1 + x2) / 2;
        doc.setFontSize(font);
        doc.text(label, cx, y - 1.5, {
          align: "center",
          baseline: "bottom" as any,
        });
        doc.setFontSize(baseFont);
      };

      const drawDimV = (
        x: number,
        y1: number,
        y2: number,
        label: string,
        options?: { arrows?: boolean; ext?: number; font?: number },
      ) => {
        const ext = options?.ext ?? 3;
        const font = options?.font ?? 9;
        // extension lines
        doc.line(x - ext, y1, x + ext, y1);
        doc.line(x - ext, y2, x + ext, y2);
        // main dim line
        doc.line(x, y1, x, y2);
        // arrows
        if (options?.arrows !== false) {
          doc.line(x, y1, x - 1.2, y1 + 1.8);
          doc.line(x, y1, x + 1.2, y1 + 1.8);
          doc.line(x, y2, x - 1.2, y2 - 1.8);
          doc.line(x, y2, x + 1.2, y2 - 1.8);
        }
        // label centered
        const cy = (y1 + y2) / 2;
        doc.setFontSize(font);
        doc.text(label, x + 2.5, cy, {
          align: "left",
          baseline: "middle" as any,
        });
        doc.setFontSize(baseFont);
      };

      const elementKeys = Object.keys(cutList.grouped);
      if (elementKeys.length === 0) {
        doc.text("Nema elemenata za specifikaciju.", margin, margin);
      }
      elementKeys.forEach((letter, idx) => {
        if (idx > 0) doc.addPage();
        doc.setFontSize(16);
        doc.text(`Specifikacija elementa ${letter}`, margin, margin + 4);
        doc.setFontSize(baseFont);
        // Schematic drawing style: thin stroke, no fill
        doc.setDrawColor(40);
        doc.setLineWidth(0.2);
        // Internal layout using elementConfigs and extras
        const elementConfigs = useShelfStore.getState().elementConfigs;
        const compartmentExtras = useShelfStore.getState().compartmentExtras;
        const cfg = (elementConfigs as any)[letter] ?? {
          columns: 1,
          rowCounts: [0],
        };
        const cols = Math.max(1, Number(cfg.columns) || 1);
        const {
          wCm: elementWcm,
          hCm: elementHcm,
          rowIdx,
        } = getElementDimsCm(letter);

        // ===============================================
        // PROPORTIONAL BOX SIZE CALCULATION
        // ===============================================
        // Max available space on PDF
        const maxBoxW = 140; // mm - max available width (leave room for dims on right)
        const maxBoxH = 65; // mm - max available height before table

        // Calculate aspect ratio of actual element
        const aspectRatio = elementWcm / elementHcm;

        // Fit to available space while preserving aspect ratio
        let boxW: number;
        let boxH: number;

        if (aspectRatio > maxBoxW / maxBoxH) {
          // Width-constrained (wide element)
          boxW = maxBoxW;
          boxH = maxBoxW / aspectRatio;
        } else {
          // Height-constrained (tall element)
          boxH = maxBoxH;
          boxW = maxBoxH * aspectRatio;
        }

        // Ensure minimum readable size
        boxW = Math.max(boxW, 35);
        boxH = Math.max(boxH, 25);

        const boxX = margin;
        const boxY = margin + 10;
        // Outer box
        doc.rect(boxX, boxY, boxW, boxH, "S");

        const cmPerMmX = elementWcm / boxW; // how many cm are represented by 1mm in drawing (X)
        const cmPerMmY = elementHcm / boxH; // how many cm are represented by 1mm in drawing (Y)
        // Material thickness in cm from selected material
        const currentMaterialId = useShelfStore.getState().selectedMaterialId;
        const mat = materials.find(
          (m) => String(m.id) === String(currentMaterialId),
        );
        const tCm = Number(mat?.thickness ?? 18) / 10; // cm
        const tOffsetXmm = tCm / cmPerMmX;
        const tOffsetYmm = tCm / cmPerMmY;
        // Base region inside element (applies to lower module or single)
        const appliesBase =
          hasBase && (heightCm <= TARGET_BOTTOM_HEIGHT_CM || rowIdx === 0);
        const baseMm = appliesBase ? Math.max(0, baseHeight / cmPerMmY) : 0;
        const innerTopMmY = boxY + tOffsetYmm;
        const innerBottomMmY = boxY + boxH - tOffsetYmm - baseMm;
        const innerLeftMmX = boxX + tOffsetXmm;
        const innerRightMmX = boxX + boxW - tOffsetXmm;
        // Draw base (hatched rectangle) if applicable
        if (appliesBase && baseMm > 0) {
          const by = boxY + boxH - baseMm;
          doc.setFillColor("#e6e6e6");
          doc.rect(
            innerLeftMmX,
            by,
            innerRightMmX - innerLeftMmX,
            baseMm,
            "FD",
          );
          doc.setFillColor("#ffffff");
          // Base height label
          doc.setFontSize(8);
          doc.text(
            `${fmt2(baseHeight)} cm`,
            innerRightMmX - 6,
            by + baseMm / 2,
            { align: "right", baseline: "middle" as any },
          );
          doc.setFontSize(baseFont);
        }
        // Vertical dividers (between inner left/right), equal division per app
        for (let c = 1; c < cols; c++) {
          const x = innerLeftMmX + (c * (innerRightMmX - innerLeftMmX)) / cols;
          doc.line(x, boxY + 1, x, boxY + boxH - 1);
        }
        // Shelves per compartment (distributed evenly)
        let firstCompGapCm: number | null = null;
        for (let c = 0; c < cols; c++) {
          const count = Math.max(
            0,
            Math.floor(Number(cfg.rowCounts?.[c] ?? 0)),
          );
          if (count <= 0) continue;
          const compX0 = boxX + (c * boxW) / cols + 1;
          const compX1 = boxX + ((c + 1) * boxW) / cols - 1;
          const innerH = Math.max(innerBottomMmY - innerTopMmY, 0);
          const gapMm = innerH / (count + 1);
          const gapCm = gapMm * cmPerMmY;
          if (firstCompGapCm == null) firstCompGapCm = gapCm;
          for (let s = 1; s <= count; s++) {
            const y = innerTopMmY + s * gapMm;
            doc.line(compX0, y, compX1, y);
          }
          // Draw a combined vertical dimension for these gaps on the left side
          const dimXLeft = boxX - 6;
          drawDimV(
            dimXLeft,
            innerTopMmY,
            innerTopMmY + gapMm,
            `${fmt2(gapCm)} cm × ${count + 1}`,
            { arrows: true, ext: 2.5, font: 8 },
          );
        }
        // Drawers region (occupies full width; count from extras) – match BlueprintView logic
        const extras = (compartmentExtras as any)[letter] ?? {};
        if (extras.drawers) {
          const drawerHcm = DRAWER_HEIGHT_CM;
          const gapCm = DRAWER_GAP_CM;
          const drawerHMm = drawerHcm / cmPerMmY;
          const gapMm = gapCm / cmPerMmY;
          const innerHMm = Math.max(innerBottomMmY - innerTopMmY, 0);
          const maxAuto = Math.max(
            0,
            Math.floor((innerHMm + gapMm) / (drawerHMm + gapMm)),
          );
          const countFromState = Math.max(
            0,
            Math.floor(Number(extras.drawersCount ?? 0)),
          );
          const used =
            countFromState > 0 ? Math.min(countFromState, maxAuto) : maxAuto;
          let lastTopOffsetMm = 0;
          for (let d = 0; d < used; d++) {
            const bottomOffsetMm = d * (drawerHMm + gapMm);
            const topOffsetMm = Math.min(
              bottomOffsetMm + drawerHMm,
              innerHMm - gapMm,
            );
            lastTopOffsetMm = topOffsetMm;
            const yTop = innerBottomMmY - topOffsetMm;
            const yBottom = innerBottomMmY - bottomOffsetMm;
            const hMm = Math.max(0, yBottom - yTop);
            // Ensure within inner bounds
            if (yTop < innerTopMmY) break;
            doc.rect(
              innerLeftMmX + 1,
              yTop,
              innerRightMmX - innerLeftMmX - 2,
              hMm,
              "S",
            );
            // Drawer height label
            const hCm = hMm * cmPerMmY;
            doc.setFontSize(8);
            doc.text(`${fmt2(hCm)} cm`, boxX + boxW / 2, yTop + hMm / 2, {
              align: "center",
              baseline: "middle" as any,
            });
            doc.setFontSize(baseFont);
          }
          // Auto shelf directly above drawers if space remains
          if (used > 0 && used < maxAuto) {
            const shelfOffsetMm = lastTopOffsetMm + gapMm + tCm / cmPerMmY;
            if (shelfOffsetMm < innerHMm) {
              const shelfY = innerBottomMmY - shelfOffsetMm;
              doc.line(innerLeftMmX, shelfY, innerRightMmX, shelfY);
            }
          }
        }
        // Rod indicator
        if (extras.rod) {
          const innerHMm = Math.max(innerBottomMmY - innerTopMmY, 0);
          const yRod = innerBottomMmY - innerHMm * 0.25;
          const inset = 2; // mm from inner sides
          doc.setLineWidth(0.4);
          doc.line(innerLeftMmX + inset, yRod, innerRightMmX - inset, yRod);
          doc.setLineWidth(0.2);
        }
        // LED label
        if (extras.led) {
          const yLabel = innerTopMmY + 3;
          doc.setFontSize(7.5);
          doc.text("LED", (innerLeftMmX + innerRightMmX) / 2, yLabel, {
            align: "center",
            baseline: "top" as any,
          });
          doc.setFontSize(baseFont);
        }
        // Optional central divider
        if (extras.verticalDivider) {
          const x = boxX + boxW / 2;
          // Emulate dashed line by drawing short segments
          const dashLen = 2;
          const gapLen = 2;
          let yy = boxY + 1;
          while (yy < boxY + boxH - 1) {
            const y2 = Math.min(yy + dashLen, boxY + boxH - 1);
            doc.line(x, yy, x, y2);
            yy = y2 + gapLen;
          }
        }
        // Dimension lines and labels (outer)
        const dimY = boxY + boxH + 6;
        drawDimH(boxX, dimY, boxX + boxW, `${fmt2(elementWcm)} cm`, {
          arrows: true,
          ext: 3,
          font: 9,
        });
        const dimX = boxX + boxW + 8;
        drawDimV(dimX, boxY, boxY + boxH, `${fmt2(elementHcm)} cm`, {
          arrows: true,
          ext: 3,
          font: 9,
        });
        // Per-compartment width dimensions (evenly divided)
        if (cols > 1) {
          const compY = dimY + 6;
          for (let c = 0; c < cols; c++) {
            const x0 = boxX + (c * boxW) / cols;
            const x1 = boxX + ((c + 1) * boxW) / cols;
            drawDimH(x0, compY, x1, `${fmt2(elementWcm / cols)} cm`, {
              arrows: true,
              ext: 2.5,
              font: 8,
            });
          }
        }

        // ===============================================
        // DOOR TYPE LABEL & HANDLE INFORMATION
        // ===============================================
        const doorGroups = useShelfStore.getState().doorGroups;
        const globalHandleId =
          useShelfStore.getState().globalHandleId || "handle_1";
        const globalHandleFinish =
          useShelfStore.getState().globalHandleFinish || "chrome";
        const doorSettingsMode =
          useShelfStore.getState().doorSettingsMode || "global";

        // Find door group for this element
        const elementDoorGroup = doorGroups.find(
          (g: { compartments: string[] }) =>
            g.compartments.some((c: string) => {
              const parsed = parseSubCompKey(c);
              return (parsed ? parsed.compKey : c).startsWith(letter);
            }),
        );

        // Track Y position for door/handle info (to the right of the schematic)
        const infoStartX = boxX + boxW + 20; // Right of schematic + dimension line space
        let infoY = boxY + 3;

        // Door type label
        if (elementDoorGroup && (elementDoorGroup as any).type !== "none") {
          const doorTypeLabels: Record<string, string> = {
            left: "Leva vrata",
            right: "Desna vrata",
            double: "Dvokrilna vrata",
            leftMirror: "Leva vrata (ogledalo)",
            rightMirror: "Desna vrata (ogledalo)",
            doubleMirror: "Dvokrilna vrata (ogledalo)",
            drawerStyle: "Vrata fioka stil",
          };
          const doorLabel =
            doorTypeLabels[(elementDoorGroup as any).type] ||
            (elementDoorGroup as any).type;

          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Vrata:", infoStartX, infoY);
          doc.setFont("helvetica", "normal");
          doc.text(doorLabel, infoStartX + 16, infoY);
          infoY += 6;

          // Handle info
          const handleId =
            doorSettingsMode === "per-door" &&
            (elementDoorGroup as any).handleId
              ? (elementDoorGroup as any).handleId
              : globalHandleId;
          const handleFinish =
            doorSettingsMode === "per-door" &&
            (elementDoorGroup as any).handleFinish
              ? (elementDoorGroup as any).handleFinish
              : globalHandleFinish;

          const handleData = storeHandles.find(
            (h) => h.legacyId === handleId || String(h.id) === handleId,
          );
          const finishData = handleData?.finishes?.find(
            (f) => f.legacyId === handleFinish || String(f.id) === handleFinish,
          );

          if (handleData && finishData) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Rucka:", infoStartX, infoY);
            doc.setFont("helvetica", "normal");
            doc.text(`${handleData.name}`, infoStartX + 16, infoY);
            infoY += 5;

            doc.setFont("helvetica", "bold");
            doc.text("Zavrsna:", infoStartX, infoY);
            doc.setFont("helvetica", "normal");
            doc.text(`${finishData.name}`, infoStartX + 18, infoY);
            infoY += 5;

            // Handle count and price
            const doorType = (elementDoorGroup as any).type;
            const handleCount =
              doorType === "double" || doorType === "doubleMirror" ? 2 : 1;
            const totalHandlePrice = finishData.price * handleCount;

            doc.setFont("helvetica", "bold");
            doc.text("Cena:", infoStartX, infoY);
            doc.setFont("helvetica", "normal");
            const priceText =
              handleCount > 1
                ? `${handleCount}x ${finishData.price.toLocaleString("sr-RS")} = ${totalHandlePrice.toLocaleString("sr-RS")} RSD`
                : `${totalHandlePrice.toLocaleString("sr-RS")} RSD`;
            doc.text(priceText, infoStartX + 13, infoY);
          }
        }

        const rows = cutList.grouped[letter];
        // Table headers
        const headers = [
          "Oznaka",
          "Opis",
          "Sirina",
          "Visina",
          "Debljina",
          "m2",
          "Cena",
        ];
        // Improved column layout - more space for Opis, tighter numeric columns
        const colX = [margin, 35, 95, 120, 143, 164, 182];
        const colW = [
          colX[1] - colX[0], // 23 - Oznaka
          colX[2] - colX[1], // 60 - Opis (wider for door descriptions)
          colX[3] - colX[2], // 25 - Sirina
          colX[4] - colX[3], // 23 - Visina
          colX[5] - colX[4], // 21 - Debljina
          colX[6] - colX[5], // 18 - m2
          210 - margin - colX[6], // ~16 - Cena
        ];
        // Numeric column indices (right-align these)
        const numericCols = [2, 3, 4, 5, 6];

        let y = Math.max(boxY + boxH + 14, dimY + (cols > 1 ? 10 : 6));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        headers.forEach((h, i) => {
          const isNumeric = numericCols.includes(i);
          const xPos = isNumeric ? colX[i] + colW[i] - 2 : colX[i] + 2;
          const align = isNumeric ? "right" : "left";
          doc.text(h, xPos, y, { align: align as any });
          doc.rect(colX[i], y - 5, colW[i], 7, "S");
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        y += 8;
        rows.forEach((it: any) => {
          const line = [
            it.code ?? "",
            String(it.desc ?? ""),
            fmt2(it.widthCm ?? 0),
            fmt2(it.heightCm ?? 0),
            fmt2(it.thicknessMm ?? 0),
            fmt2(it.areaM2 ?? 0),
            fmt2(it.cost ?? 0),
          ];
          // Wrap description if too long
          const descLines = doc.splitTextToSize(line[1], colW[1] - 4);
          const rowH = Math.max(7, (descLines.length || 1) * 4 + 3);

          // Draw cells and content with proper alignment
          for (let i = 0; i < 7; i++) {
            doc.rect(colX[i], y - 5, colW[i], rowH, "S");
            const isNumeric = numericCols.includes(i);
            const xPos = isNumeric ? colX[i] + colW[i] - 2 : colX[i] + 2;
            const align = isNumeric ? "right" : "left";
            if (i === 1) {
              // Description column - uses wrapped text
              doc.text(descLines, colX[1] + 2, y);
            } else {
              doc.text(line[i], xPos, y, { align: align as any });
            }
          }
          y += rowH + 2;
          // Page break if near bottom
          if (y > pageH - margin - 10) {
            doc.addPage();
            y = margin + 10;
          }
        });
        // Footer totals for the element
        const elementArea = rows.reduce(
          (a: number, b: any) => a + (b.areaM2 ?? 0),
          0,
        );
        const elementCost = rows.reduce(
          (a: number, b: any) => a + (b.cost ?? 0),
          0,
        );

        // Calculate handle cost for this element
        let elementHandleCost = 0;
        if (elementDoorGroup && (elementDoorGroup as any).type !== "none") {
          const handleId =
            doorSettingsMode === "per-door" &&
            (elementDoorGroup as any).handleId
              ? (elementDoorGroup as any).handleId
              : globalHandleId;
          const handleFinish =
            doorSettingsMode === "per-door" &&
            (elementDoorGroup as any).handleFinish
              ? (elementDoorGroup as any).handleFinish
              : globalHandleFinish;

          const handleData = storeHandles.find(
            (h) => h.legacyId === handleId || String(h.id) === handleId,
          );
          const finishData = handleData?.finishes?.find(
            (f) => f.legacyId === handleFinish || String(f.id) === handleFinish,
          );

          if (finishData) {
            const doorType = (elementDoorGroup as any).type;
            const handleCount =
              doorType === "double" || doorType === "doubleMirror" ? 2 : 1;
            elementHandleCost = finishData.price * handleCount;
          }
        }

        y += 8;
        doc.setFont("helvetica", "bold");
        doc.text(`Ukupna kvadratura: ${fmt2(elementArea)} m2`, margin, y);
        doc.text(`Cena materijala: ${fmt2(elementCost)}`, margin + 70, y);
        if (elementHandleCost > 0) {
          doc.text(
            `Rucke: ${elementHandleCost.toLocaleString("sr-RS")} RSD`,
            margin + 135,
            y,
          );
        }
        doc.setFont("helvetica", "normal");
      });
      doc.save("specifikacija-elemenata.pdf");
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }, [cutList, fmt2]);

  // Export cut list tables to PDF (simpler version without schematic drawings)
  const handleExportCutListPDF = React.useCallback(() => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageH = 297;
      const margin = 12;

      // Title
      doc.setFontSize(16);
      doc.text("Tabela ploca (Cut list)", margin, margin + 4);

      // Price per m²
      doc.setFontSize(10);
      doc.text(
        `Cena materijala: ${fmt2(cutList.pricePerM2)} RSD/m2`,
        margin,
        margin + 12,
      );

      let y = margin + 20;
      const elementKeys = Object.keys(cutList.grouped).sort();

      elementKeys.forEach((letter, idx) => {
        // Check if we need a new page before starting element
        if (idx > 0 && y > pageH - 60) {
          doc.addPage();
          y = margin;
        }

        // Element header
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Element ${letter}`, margin, y);
        y += 6;

        // Table headers
        const headers = [
          "Oznaka",
          "Opis",
          "S (cm)",
          "V (cm)",
          "Deb",
          "m2",
          "Cena",
        ];
        const colX = [margin, 30, 80, 105, 130, 150, 170];

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        headers.forEach((h, i) => {
          doc.text(h, colX[i], y);
        });
        y += 5;

        // Underline headers
        doc.setLineWidth(0.1);
        doc.line(margin, y - 3, 210 - margin, y - 3);

        // Table rows
        doc.setFont("helvetica", "normal");
        const rows = cutList.grouped[letter];
        rows.forEach((it: any) => {
          if (y > pageH - 20) {
            doc.addPage();
            y = margin;
          }
          doc.text(it.code || "", colX[0], y);
          const desc = doc.splitTextToSize(it.desc || "", 45);
          doc.text(desc[0] || "", colX[1], y);
          doc.text(fmt2(it.widthCm), colX[2], y);
          doc.text(fmt2(it.heightCm), colX[3], y);
          doc.text(fmt2(it.thicknessMm), colX[4], y);
          doc.text(fmt2(it.areaM2), colX[5], y);
          doc.text(fmt2(it.cost), colX[6], y);
          y += 5;
        });

        // Element totals
        const elemArea = rows.reduce(
          (a: number, b: any) => a + (b.areaM2 || 0),
          0,
        );
        const elemCost = rows.reduce(
          (a: number, b: any) => a + (b.cost || 0),
          0,
        );
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.text(
          `Ukupno: ${fmt2(elemArea)} m2 | ${fmt2(elemCost)} RSD`,
          margin,
          y,
        );
        y += 10;
      });

      // Grand totals
      y += 5;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`UKUPNA KVADRATURA: ${fmt2(cutList.totalArea)} m2`, margin, y);
      doc.text(`UKUPNA CENA: ${fmt2(cutList.totalCost)} RSD`, margin, y + 7);

      doc.save("tabela-ploca.pdf");
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }, [cutList, fmt2]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Auth Section at top */}
      <div className="flex-shrink-0 sticky top-0 bg-sidebar z-10 px-4 pt-3 pb-2 border-b">
        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-auto py-1 hover:text-white"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(
                      session.user?.name || session.user?.email || "U",
                    )}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs truncate flex-1 text-left">
                  {session.user?.email}
                </span>
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{session.user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/wardrobes" className="flex items-center">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Moji Ormani
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/orders" className="flex items-center">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Porudžbine
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/account" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Nalog
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Odjavi se
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoginClick}
                className="w-full justify-start hover:text-white h-auto py-1"
              >
                <User className="h-3.5 w-3.5 mr-2" />
                Prijavi se
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Dobrodošli</DialogTitle>
                <DialogDescription>
                  Prijavite se da biste sačuvali vaš dizajn ormana
                </DialogDescription>
              </DialogHeader>
              <AuthForms
                onSuccess={() => {
                  setAuthDialogOpen(false);
                  // Refresh to update session and trigger pending state restoration
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
        {/* Back to Order banner - shown when editing from order context */}
        {fromOrderId && fromOrderNumber && (
          <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                Uređivanje za porudžbinu{" "}
                <span className="font-semibold text-foreground">
                  #{fromOrderNumber}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-accent text-accent hover:bg-accent hover:text-white"
              >
                <Link href={`/admin/orders/${fromOrderId}`}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Nazad
                </Link>
              </Button>
            </div>
          </div>
        )}

        <Accordion
          type="single"
          collapsible
          value={activeAccordionStep ?? undefined}
          onValueChange={(value) => setActiveAccordionStep(value || null)}
          className="w-full"
        >
          <AccordionItem value="item-1" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              1. Definiši spoljašnje dimenzije
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pt-4">
              <DimensionControl
                label="Širina"
                value={width}
                setValue={setWidth}
                min={50}
                max={400}
                step={1}
              />
              <DimensionControl
                label="Visina"
                value={height}
                setValue={setHeight}
                min={50}
                max={280}
                step={1}
              />
              <DimensionControl
                label="Dubina"
                value={depth}
                setValue={setDepth}
                min={20}
                max={100}
                step={1}
              />

              {/* Next step button */}
              <Button
                variant="default"
                className="w-full mt-4 gap-2"
                onClick={() => setActiveAccordionStep("item-2")}
              >
                Sledeći korak
                <ArrowRight className="h-4 w-4" />
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              2. Kolone i Pregrade
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {!selectedCompartmentKey ? (
                <div className="space-y-3">
                  <CompartmentSchematic />
                  <p className="text-xs text-center text-muted-foreground">
                    Kliknite na pregradu u 3D prikazu
                  </p>
                </div>
              ) : (
                <CompartmentExtrasPanel
                  compartmentKey={selectedCompartmentKey}
                  materials={materials}
                />
              )}

              {/* Next step button */}
              <Button
                variant="default"
                className="w-full mt-4 gap-2"
                onClick={() => setActiveAccordionStep("item-3")}
              >
                Sledeći korak
                <ArrowRight className="h-4 w-4" />
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              3. Izbor materijala
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pt-4">
              {/* Group materials by category */}
              {(() => {
                // Get all unique categories from materials (flatten arrays)
                const allCategories = [
                  ...new Set(materials.flatMap((m) => m.categories)),
                ];
                return allCategories.map((category) => {
                  // Filter materials that have this category
                  const categoryMaterials = materials.filter((m) =>
                    m.categories.includes(category),
                  );
                  // Determine category type
                  const isBackCategory =
                    category.toLowerCase().includes("leđa") ||
                    category.toLowerCase().includes("ledja");
                  const isFrontCategory =
                    category.toLowerCase().includes("lica") ||
                    category.toLowerCase().includes("vrata");

                  // Get the correct selected ID and setter for each category
                  const categoryType = isBackCategory
                    ? "back"
                    : isFrontCategory
                      ? "front"
                      : "korpus";
                  const selectedId = isBackCategory
                    ? selectedBackMaterialId
                    : isFrontCategory
                      ? selectedFrontMaterialId
                      : selectedMaterialId;
                  const setSelectedId = isBackCategory
                    ? setSelectedBackMaterialId
                    : isFrontCategory
                      ? setSelectedFrontMaterialId
                      : setSelectedMaterialId;

                  // Get pinned material ID for this category (only set when selecting from popup)
                  const pinnedId = pinnedMaterialIds[categoryType];

                  // Sort so pinned material is first (not selected, to avoid reordering on preview click)
                  const sorted = [...categoryMaterials].sort((a, b) => {
                    if (pinnedId !== undefined) {
                      if (a.id === pinnedId) return -1;
                      if (b.id === pinnedId) return 1;
                    }
                    return 0;
                  });

                  // Show only 3 materials in preview
                  const preview = sorted.slice(0, 3);
                  const remaining = categoryMaterials.length - 3;

                  return (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-semibold">{category}</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {preview.map((material) => (
                          <div
                            key={material.id}
                            className="flex flex-col items-center"
                          >
                            <button
                              type="button"
                              className={`rounded-lg border-2 ${
                                selectedId === material.id
                                  ? "border-primary"
                                  : "border-transparent"
                              } hover:border-primary h-20 w-full bg-cover bg-center bg-muted`}
                              style={{
                                backgroundImage: material.img
                                  ? `url(${material.img})`
                                  : undefined,
                              }}
                              onClick={() => setSelectedId(material.id)}
                              title={material.name}
                            >
                              <span className="sr-only">{material.name}</span>
                            </button>
                            <span className="text-xs mt-1 text-center truncate w-full">
                              {material.name}
                            </span>
                          </div>
                        ))}
                      </div>
                      {remaining > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setOpenMaterialCategory(category)}
                        >
                          Prikaži više ({remaining})
                        </Button>
                      )}
                      <MaterialPickerModal
                        open={openMaterialCategory === category}
                        onOpenChange={(open) =>
                          setOpenMaterialCategory(open ? category : null)
                        }
                        category={category}
                        materials={categoryMaterials}
                        selectedId={selectedId}
                        onSelect={(id) => {
                          setSelectedId(id);
                          // Pin this material to first position when selected from popup
                          setPinnedMaterialIds((prev) => ({
                            ...prev,
                            [categoryType]: id,
                          }));
                        }}
                      />
                    </div>
                  );
                });
              })()}
              {selectedBackMaterialId == null && (
                <p className="text-destructive text-sm mt-4">
                  Izaberite materijal za leđa
                </p>
              )}

              {/* Note about per-door settings in Step 5 */}
              <p className="text-xs text-muted-foreground mt-2 px-2 py-2 bg-muted/50 rounded">
                Materijal za lica/vrata i ručke možete dodatno podesiti po
                vratima u koraku 5.
              </p>

              {/* Next step button */}
              <Button
                variant="default"
                className="w-full mt-4 gap-2"
                onClick={() => setActiveAccordionStep("item-4")}
              >
                Sledeći korak
                <ArrowRight className="h-4 w-4" />
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Base (Baza) */}
          <AccordionItem value="item-4" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              4. Baza
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="switch-base"
                  className="text-sm select-none cursor-pointer"
                >
                  Uključi bazu (donja pregrada)
                </label>
                <Switch
                  id="switch-base"
                  checked={hasBase}
                  onCheckedChange={setHasBase}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Visina baze</span>
                  <span className="text-xs text-muted-foreground">
                    {baseHeight} cm
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setBaseHeight(Math.max(baseHeight - 1, 3))}
                    disabled={!hasBase}
                    className="px-2"
                  >
                    –
                  </Button>
                  <Slider
                    min={3}
                    max={10}
                    step={1}
                    value={[baseHeight]}
                    onValueChange={([val]) => setBaseHeight(val)}
                    disabled={!hasBase}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setBaseHeight(Math.min(baseHeight + 1, 10))}
                    disabled={!hasBase}
                    className="px-2"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Next step button */}
              <Button
                variant="default"
                className="w-full mt-4 gap-2"
                onClick={() => setActiveAccordionStep("item-5")}
              >
                Sledeći korak
                <ArrowRight className="h-4 w-4" />
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Doors */}
          <AccordionItem value="item-5" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              5. Vrata
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {selectedDoorCompartments.length === 0 ? (
                <div className="space-y-3">
                  <CompartmentSchematic />
                  <p className="text-xs text-center text-muted-foreground">
                    Kliknite na pregradu ili prevucite za višestruki izbor
                  </p>
                </div>
              ) : (
                <DoorOptionsPanel
                  selectedKeys={selectedDoorCompartments}
                  compartmentHeights={(() => {
                    // Calculate compartment heights - MATCHING CarcassFrame logic exactly
                    const w = width / 100;
                    const h = height / 100;
                    const t = 0.018; // panel thickness
                    const baseH = hasBase ? baseHeight / 100 : 0;
                    const splitThreshold = TARGET_BOTTOM_HEIGHT_CM / 100; // 2.0m

                    const columns = buildBlocksX(
                      w,
                      verticalBoundaries.length > 0
                        ? verticalBoundaries
                        : undefined,
                    );

                    const heights: Record<string, number> = {};

                    columns.forEach((col, colIdx) => {
                      const colLetter = toLetters(colIdx);
                      // Get column-specific height (or global height)
                      const colH = (columnHeights[colIdx] ?? height) / 100;
                      // Get array of shelf Y positions for this column
                      const shelves = columnHorizontalBoundaries[colIdx] || [];
                      // Get module boundary for this column (if split)
                      const moduleBoundary =
                        columnModuleBoundaries[colIdx] ?? null;
                      const hasModuleBoundary =
                        moduleBoundary !== null && colH > splitThreshold;
                      // Top module shelves
                      const topModuleShelves =
                        columnTopModuleShelves[colIdx] || [];
                      // Number of compartments in bottom module
                      const bottomModuleCompartments = shelves.length + 1;

                      // Calculate height for each bottom module compartment
                      for (
                        let compIdx = 0;
                        compIdx < bottomModuleCompartments;
                        compIdx++
                      ) {
                        const compKey = `${colLetter}${compIdx + 1}`;
                        let bottomSurface: number;
                        let topSurface: number;

                        // Last compartment in bottom module (when module boundary exists)
                        if (
                          hasModuleBoundary &&
                          compIdx === bottomModuleCompartments - 1
                        ) {
                          bottomSurface =
                            compIdx === 0
                              ? baseH + t
                              : shelves[compIdx - 1] + t / 2;
                          topSurface = moduleBoundary - t;
                        } else {
                          // Regular compartments
                          if (compIdx === 0) {
                            bottomSurface = baseH + t;
                          } else {
                            bottomSurface = shelves[compIdx - 1] + t / 2;
                          }

                          if (
                            compIdx === shelves.length &&
                            !hasModuleBoundary
                          ) {
                            topSurface = colH - t;
                          } else {
                            topSurface = shelves[compIdx] - t / 2;
                          }
                        }

                        heights[compKey] = Math.round(
                          (topSurface - bottomSurface) * 100,
                        );
                      }

                      // Calculate height for each top module compartment
                      if (hasModuleBoundary) {
                        const topModuleCompartments =
                          topModuleShelves.length + 1;
                        for (
                          let topCompIdx = 0;
                          topCompIdx < topModuleCompartments;
                          topCompIdx++
                        ) {
                          const compIdx = bottomModuleCompartments + topCompIdx;
                          const compKey = `${colLetter}${compIdx + 1}`;
                          let bottomSurface: number;
                          let topSurface: number;

                          if (topCompIdx === 0) {
                            bottomSurface = moduleBoundary + t;
                          } else {
                            bottomSurface =
                              topModuleShelves[topCompIdx - 1] + t / 2;
                          }

                          if (topCompIdx === topModuleShelves.length) {
                            topSurface = colH - t;
                          } else {
                            topSurface = topModuleShelves[topCompIdx] - t / 2;
                          }

                          heights[compKey] = Math.round(
                            (topSurface - bottomSurface) * 100,
                          );
                        }
                      }

                      // Calculate sub-compartment heights for elementConfigs with subdivisions
                      // Iterate through all compartments in this column
                      const totalCompartments = hasModuleBoundary
                        ? bottomModuleCompartments + topModuleShelves.length + 1
                        : bottomModuleCompartments;

                      for (
                        let compIdx = 0;
                        compIdx < totalCompartments;
                        compIdx++
                      ) {
                        const compKey = `${colLetter}${compIdx + 1}`;
                        const mainHeight = heights[compKey];
                        if (!mainHeight) continue;

                        const cfg = elementConfigs[compKey] ?? {
                          columns: 1,
                          rowCounts: [0],
                        };
                        const innerCols = Math.max(1, cfg.columns);
                        const hasSubdivisions =
                          innerCols > 1 ||
                          (cfg.rowCounts?.some((rc) => rc > 0) ?? false);

                        if (!hasSubdivisions) continue;

                        // Calculate sub-compartment heights for this compartment
                        const mainHeightM = mainHeight / 100; // Convert back to meters

                        for (let secIdx = 0; secIdx < innerCols; secIdx++) {
                          const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
                          const numSpaces = shelfCount + 1;
                          const gap = mainHeightM / (shelfCount + 1);

                          for (
                            let spaceIdx = 0;
                            spaceIdx < numSpaces;
                            spaceIdx++
                          ) {
                            // Calculate space height (account for shelf thickness)
                            const spaceBottomOffset =
                              spaceIdx * gap + (spaceIdx > 0 ? t / 2 : 0);
                            const spaceTopOffset =
                              (spaceIdx + 1) * gap -
                              (spaceIdx < shelfCount ? t / 2 : 0);
                            const spaceHeightCm = Math.round(
                              (spaceTopOffset - spaceBottomOffset) * 100,
                            );

                            const subKey = `${compKey}.${secIdx}.${spaceIdx}`;
                            heights[subKey] = spaceHeightCm;
                          }
                        }
                      }
                    });
                    return heights;
                  })()}
                />
              )}
              {/* Show/Hide Doors toggle - only when doors exist */}
              {doorGroups.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setShowDoors(!showDoors)}
                  className="w-full mt-4"
                  size="sm"
                >
                  {showDoors ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {showDoors
                    ? "Sakrij vrata na slici"
                    : "Prikaži vrata na slici"}
                </Button>
              )}
            </AccordionContent>
          </AccordionItem>
          {/* Actions and Controls */}
          <div className="flex flex-col gap-4 mt-6">
            {/* Primary Actions */}
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleSaveClick}
                className="flex-1"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                Sačuvaj dizajn
              </Button>
            </div>

            {/* View Controls */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                Prikaz
              </p>
              <Button
                variant={showDimensions ? "secondary" : "ghost"}
                onClick={() => setShowDimensions(!showDimensions)}
                className="w-full justify-start"
                size="sm"
              >
                {showDimensions ? (
                  <EyeOff className="h-4 w-4 mr-2" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {showDimensions ? "Sakrij Mere" : "Prikaži Mere"}
              </Button>
            </div>

            {/* Reports & Data */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                Izveštaji
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowCutList(true)}
                  className="w-full justify-start"
                  size="sm"
                >
                  <Table className="h-4 w-4 mr-2" />
                  Tabela ploča
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportElementSpecs}
                  className="w-full justify-between"
                  size="sm"
                >
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Specifikacija elemenata
                  </span>
                  <Download className="h-3 w-3 opacity-50" />
                </Button>
              </div>
            </div>

            {/* Downloads */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                Preuzimanja
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadFrontView}
                  className="w-full justify-start"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Frontalni prikaz
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadFrontEdges}
                  className="w-full justify-start"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Ivice (front)
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadTechnical2D}
                  className="w-full justify-start"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Tehnički crtež 2D
                </Button>
              </div>
            </div>
          </div>
        </Accordion>
      </div>

      {/* Sticky Footer - Summary */}
      <div className="flex-shrink-0 sticky bottom-0 bg-sidebar z-10 px-4 py-3 border-t space-y-2">
        {/* Kvadratura row */}
        <div className="flex items-center justify-between">
          <span className="text-base text-muted-foreground">
            Ukupna kvadratura
          </span>
          <span className="text-lg font-bold">
            {fmt2(cutList.totalArea)} m²
          </span>
        </div>

        {/* Poruči button with price */}
        <button
          onClick={handleOrderClick}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors cursor-pointer"
        >
          <span className="text-base font-bold uppercase">Poruči</span>
          <span className="text-xl font-bold">
            {fmt2(cutList.totalCost)} RSD
          </span>
        </button>
      </div>

      {/* Cut List Modal */}
      {showCutList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCutList(false)}
          />
          <div className="relative bg-background border rounded-lg shadow-xl w-[92vw] max-w-6xl max-h-[85vh] flex flex-col">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-4 border-b bg-background rounded-t-lg flex-shrink-0">
              <h3 className="text-lg font-semibold">Tabela ploča (Cut list)</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCutListPDF}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportElementSpecs}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Specifikacija
                </Button>
                <Button variant="outline" onClick={() => setShowCutList(false)}>
                  Zatvori
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Cena materijala (po m²): {fmt2(cutList.pricePerM2)}
                </div>
                {Object.keys(cutList.grouped).map((letter) => (
                  <div key={letter} className="space-y-2">
                    <div className="font-semibold">Element {letter}</div>
                    <div className="overflow-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 pr-2">Oznaka</th>
                            <th className="text-left py-1 pr-2">Opis</th>
                            <th className="text-right py-1 pr-2">
                              Širina (cm)
                            </th>
                            <th className="text-right py-1 pr-2">
                              Visina (cm)
                            </th>
                            <th className="text-right py-1 pr-2">
                              Debljina (mm)
                            </th>
                            <th className="text-right py-1 pr-2">
                              Kvadratura (m²)
                            </th>
                            <th className="text-right py-1 pr-2">Cena</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cutList.grouped[letter].map((it: any, i: number) => (
                            <tr
                              key={`${it.code}-${i}`}
                              className="border-b last:border-0"
                            >
                              <td className="py-1 pr-2 whitespace-nowrap">
                                {it.code}
                              </td>
                              <td className="py-1 pr-2">{it.desc}</td>
                              <td className="py-1 pr-2 text-right">
                                {fmt2(it.widthCm)}
                              </td>
                              <td className="py-1 pr-2 text-right">
                                {fmt2(it.heightCm)}
                              </td>
                              <td className="py-1 pr-2 text-right">
                                {fmt2(it.thicknessMm)}
                              </td>
                              <td className="py-1 pr-2 text-right">
                                {fmt2(it.areaM2)}
                              </td>
                              <td className="py-1 pr-2 text-right">
                                {fmt2(it.cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end gap-8 text-sm font-semibold">
                  <div>Ukupna kvadratura: {fmt2(cutList.totalArea)} m²</div>
                  <div>Ukupna cena: {fmt2(cutList.totalCost)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Alert Dialog - shown when user tries to save without being logged in */}
      <AlertDialog open={loginAlertOpen} onOpenChange={setLoginAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Prijavite se</AlertDialogTitle>
            <AlertDialogDescription>
              Morate biti prijavljeni da biste sačuvali orman. Želite li da se
              prijavite sada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLoginAlertOpen(false);
                handleLoginClick();
              }}
            >
              Prijavi se
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Wardrobe Dialog - shown when logged in user clicks save */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sačuvaj orman</DialogTitle>
            <DialogDescription>Unesite naziv za vaš orman</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wardrobe-name">Naziv ormana</Label>
              <Input
                id="wardrobe-name"
                value={wardrobeName}
                onChange={(e) => setWardrobeName(e.target.value)}
                placeholder="Unesite naziv..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    performSave();
                  }
                }}
              />
            </div>
            {/* Show save mode options when admin loaded any wardrobe */}
            {isAdmin && loadedWardrobeId && (
              <div className="space-y-2">
                {/* When from order context: no choice, just info message */}
                {fromOrderId && fromOrderNumber ? (
                  <p className="text-sm text-muted-foreground">
                    Izmene će biti sačuvane na postojeći orman za porudžbinu #
                    {fromOrderNumber}
                  </p>
                ) : (
                  // Normal admin editing: show RadioGroup options
                  <>
                    <Label>Opcije čuvanja</Label>
                    <RadioGroup
                      value={saveMode}
                      onValueChange={(value) =>
                        setSaveMode(value as "update" | "new")
                      }
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="update" id="save-mode-update" />
                        <Label
                          htmlFor="save-mode-update"
                          className="font-normal"
                        >
                          Ažuriraj postojeći{" "}
                          {loadedWardrobeIsModel ? "model" : "orman"}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="save-mode-new" />
                        <Label htmlFor="save-mode-new" className="font-normal">
                          Sačuvaj kao novi
                        </Label>
                      </div>
                    </RadioGroup>
                  </>
                )}
              </div>
            )}
            {/* Show "Save as model" checkbox only for new saves and NOT from order context */}
            {isAdmin && saveMode === "new" && !fromOrderId && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-as-model"
                  checked={saveAsModel}
                  onCheckedChange={(checked) => setSaveAsModel(!!checked)}
                />
                <Label htmlFor="save-as-model">Sačuvaj kao model</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Otkaži
            </Button>
            <Button onClick={performSave}>Sačuvaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        orderData={{
          wardrobeSnapshot: getWardrobeSnapshot(),
          thumbnail: checkoutThumbnail,
          materialId: selectedMaterialId,
          materialName:
            materials.find((m) => String(m.id) === String(selectedMaterialId))
              ?.name ?? "",
          materialProductCode:
            materials.find((m) => String(m.id) === String(selectedMaterialId))
              ?.productCode ?? null,
          frontMaterialId: selectedFrontMaterialId!,
          frontMaterialName:
            materials.find(
              (m) => String(m.id) === String(selectedFrontMaterialId),
            )?.name ?? "",
          frontMaterialProductCode:
            materials.find(
              (m) => String(m.id) === String(selectedFrontMaterialId),
            )?.productCode ?? null,
          backMaterialId: selectedBackMaterialId ?? null,
          backMaterialName: selectedBackMaterialId
            ? (materials.find(
                (m) => String(m.id) === String(selectedBackMaterialId),
              )?.name ?? null)
            : null,
          backMaterialProductCode: selectedBackMaterialId
            ? (materials.find(
                (m) => String(m.id) === String(selectedBackMaterialId),
              )?.productCode ?? null)
            : null,
          totalArea: Math.round(cutList.totalArea * 10000), // Convert m² to cm²
          totalPrice: cutList.totalCost,
          priceBreakdown: cutList.priceBreakdown,
          dimensions: {
            width,
            height,
            depth,
          },
        }}
      />
    </div>
  );
}

// Example: Top-right controls (e.g. in Scene.tsx or AppBar.tsx)
export function TopRightControls() {
  const viewMode = useShelfStore((state: ShelfState) => state.viewMode);
  const setViewMode = useShelfStore((state: ShelfState) => state.setViewMode);
  // For backward compatibility with existing camera mode logic
  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
  const setCameraMode = (mode: "2D" | "3D") => setViewMode(mode);
  const showDimensions = useShelfStore(
    (state: ShelfState) => state.showDimensions,
  );
  const setShowDimensions = useShelfStore(
    (state: ShelfState) => state.setShowDimensions,
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        display: "flex",
        gap: 8,
        zIndex: 10,
      }}
    >
      <Button
        variant={cameraMode === "2D" ? "default" : "outline"}
        size="sm"
        onClick={() => setCameraMode("2D")}
      >
        2D
      </Button>
      <Button
        variant={cameraMode === "3D" ? "default" : "outline"}
        size="sm"
        onClick={() => setCameraMode("3D")}
      >
        3D
      </Button>
      <Button
        variant={showDimensions ? "default" : "outline"}
        size="sm"
        onClick={() => setShowDimensions(!showDimensions)}
      >
        {showDimensions ? "Hide Dimensions" : "Show Dimensions"}
      </Button>
    </div>
  );
}
