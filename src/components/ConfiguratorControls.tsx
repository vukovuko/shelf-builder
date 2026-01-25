"use client";

import jsPDF from "jspdf";
import {
  ChevronDown,
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
import { useShelfStore, type Material } from "@/lib/store";
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
  const setViewMode = useShelfStore((state) => state.setViewMode);
  const viewMode = useShelfStore((state) => state.viewMode);
  // For backward compatibility with existing camera mode logic
  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
  const setCameraMode = (mode: "2D" | "3D") => setViewMode(mode);
  const setShowEdgesOnly = useShelfStore((state) => state.setShowEdgesOnly);
  const _showEdgesOnly = useShelfStore((state) => state.showEdgesOnly);

  // Download front edges only as JPG
  const handleDownloadFrontEdges = React.useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;
    useShelfStore.getState().setShowDimensions(true);
    setShowEdgesOnly(true);
    useShelfStore.getState().triggerFitToView();
    if (cameraMode !== "2D") {
      setCameraMode("2D");
    }
    // Wait for scene to fully re-render with edges-only mode
    await new Promise((resolve) => setTimeout(resolve, 500));
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
  }, [cameraMode, setCameraMode, setShowEdgesOnly]);

  const handleDownloadFrontView = React.useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;
    useShelfStore.getState().setShowDimensions(true);
    useShelfStore.getState().triggerFitToView();
    if (cameraMode !== "2D") {
      setCameraMode("2D");
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      useShelfStore.getState().setShowDimensions(prevDims);
      return;
    }
    await new Promise(requestAnimationFrame);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "wardrobe-front-view.jpg";
    link.click();
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode]);

  // Download 2D technical drawing (only edges, white fill, no shadows)
  const handleDownloadTechnical2D = React.useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;
    useShelfStore.getState().setShowDimensions(true);
    setShowEdgesOnly(true);
    useShelfStore.getState().triggerFitToView();
    if (cameraMode !== "2D") {
      setCameraMode("2D");
    }
    // Wait for scene to fully re-render with edges-only mode
    await new Promise((resolve) => setTimeout(resolve, 500));
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
    link.download = "wardrobe-technical-2d.jpg";
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, setShowEdgesOnly]);

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
  const selectedMaterialId = useShelfStore((state) => state.selectedMaterialId);
  const setSelectedMaterialId = useShelfStore(
    (state) => state.setSelectedMaterialId,
  );
  const selectedFrontMaterialId = useShelfStore(
    (state) => state.selectedFrontMaterialId,
  );
  const setSelectedFrontMaterialId = useShelfStore(
    (state) => state.setSelectedFrontMaterialId,
  );
  const selectedBackMaterialId = useShelfStore(
    (state) => state.selectedBackMaterialId,
  );
  const setSelectedBackMaterialId = useShelfStore(
    (state) => state.setSelectedBackMaterialId,
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

  const showDimensions = useShelfStore((state) => state.showDimensions);
  const setShowDimensions = useShelfStore((state) => state.setShowDimensions);
  // Base (baza) state
  const hasBase = useShelfStore((state) => state.hasBase);
  const baseHeight = useShelfStore((state) => state.baseHeight);
  const setHasBase = useShelfStore((state) => state.setHasBase);
  const setBaseHeight = useShelfStore((state) => state.setBaseHeight);

  // Accordion step state (for controlled accordion)
  const activeAccordionStep = useShelfStore(
    (state) => state.activeAccordionStep,
  );
  const setActiveAccordionStep = useShelfStore(
    (state) => state.setActiveAccordionStep,
  );
  const selectedCompartmentKey = useShelfStore(
    (state) => state.selectedCompartmentKey,
  );

  // State for global info toggle
  const [allInfoShown, setAllInfoShown] = React.useState(false);
  const [showCutList, setShowCutList] = React.useState(false);
  const setShowInfoButtons = useShelfStore((state) => state.setShowInfoButtons);

  // Track loaded wardrobe for update functionality
  const loadedWardrobeId = useShelfStore((state) => state.loadedWardrobeId);
  const loadedWardrobeIsModel = useShelfStore(
    (state) => state.loadedWardrobeIsModel,
  );
  const clearLoadedWardrobe = useShelfStore(
    (state) => state.clearLoadedWardrobe,
  );

  // Track order context when editing from order detail page
  const fromOrderId = useShelfStore((state) => state.fromOrderId);
  const fromOrderNumber = useShelfStore((state) => state.fromOrderNumber);
  const clearFromOrder = useShelfStore((state) => state.clearFromOrder);

  // Track which material should be pinned to first position per category type
  // Only updated when selecting from popup, not when clicking preview images
  const [pinnedMaterialIds, setPinnedMaterialIds] = React.useState<{
    korpus?: number;
    front?: number;
    back?: number;
  }>({});

  // Additional store reads needed for cut list (top-level to respect Rules of Hooks)
  const elementConfigs = useShelfStore((state) => state.elementConfigs);
  const compartmentExtras = useShelfStore((state) => state.compartmentExtras);
  const doorSelections = useShelfStore((state) => state.doorSelections);
  // Structural boundaries - CRITICAL for accurate area calculation
  const verticalBoundaries = useShelfStore((state) => state.verticalBoundaries);
  const columnHorizontalBoundaries = useShelfStore(
    (state) => state.columnHorizontalBoundaries,
  );
  const columnModuleBoundaries = useShelfStore(
    (state) => state.columnModuleBoundaries,
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
        },
        materials,
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
      // Structural boundaries
      verticalBoundaries,
      columnHorizontalBoundaries,
      columnModuleBoundaries,
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
        // Draw a vector schematic of the element (front view) above the table
        // Box size
        const boxW = 90; // mm
        const boxH = 60; // mm
        const boxX = margin;
        const boxY = margin + 10;
        // Outer box
        doc.rect(boxX, boxY, boxW, boxH, "S");
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
        const rows = cutList.grouped[letter];
        // Table headers
        const headers = [
          "Oznaka",
          "Opis",
          "Širina (cm)",
          "Visina (cm)",
          "Debljina (mm)",
          "Kvadratura (m²)",
          "Cena",
        ];
        // Tighter column layout to reduce total table width
        const colX = [margin, 40, 85, 115, 140, 165, 185];
        const colW = [
          colX[1] - colX[0],
          colX[2] - colX[1],
          colX[3] - colX[2],
          colX[4] - colX[3],
          colX[5] - colX[4],
          colX[6] - colX[5],
          210 - margin - colX[6],
        ];
        let y = Math.max(boxY + boxH + 14, dimY + (cols > 1 ? 10 : 6));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        headers.forEach((h, i) => {
          doc.text(h, colX[i] + 2, y);
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
          doc.rect(colX[0], y - 5, colW[0], rowH, "S");
          doc.text(line[0], colX[0] + 2, y);
          doc.rect(colX[1], y - 5, colW[1], rowH, "S");
          doc.text(descLines, colX[1] + 2, y);
          doc.rect(colX[2], y - 5, colW[2], rowH, "S");
          doc.text(line[2], colX[2] + 2, y);
          doc.rect(colX[3], y - 5, colW[3], rowH, "S");
          doc.text(line[3], colX[3] + 2, y);
          doc.rect(colX[4], y - 5, colW[4], rowH, "S");
          doc.text(line[4], colX[4] + 2, y);
          doc.rect(colX[5], y - 5, colW[5], rowH, "S");
          doc.text(line[5], colX[5] + 2, y);
          doc.rect(colX[6], y - 5, colW[6], rowH, "S");
          doc.text(line[6], colX[6] + 2, y);
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
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.text(`Ukupna kvadratura: ${fmt2(elementArea)} m²`, margin, y);
        doc.text(`Ukupna cena: ${fmt2(elementCost)}`, margin + 90, y);
        doc.setFont("helvetica", "normal");
      });
      doc.save("specifikacija-elemenata.pdf");
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }, [cutList, fmt2]);

  // Reset info button state if wardrobe structure changes
  const rowCounts = useShelfStore((state) => state.rowCounts);
  React.useEffect(() => {
    setAllInfoShown(false);
    setShowInfoButtons(false);
    // Always reset overlays to hidden on structure change
    if (wardrobeRef?.current?.toggleAllInfo) {
      wardrobeRef.current.toggleAllInfo(false);
    }
  }, [rowCounts, wardrobeRef, setShowInfoButtons]);

  const handleToggleAllInfo = () => {
    const newState = !allInfoShown;
    setShowInfoButtons(newState);
    setAllInfoShown(newState);
    if (wardrobeRef?.current?.toggleAllInfo) {
      wardrobeRef.current.toggleAllInfo(newState);
    }
  };

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
              <AuthForms onSuccess={() => setAuthDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
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
            </AccordionContent>
          </AccordionItem>

          {/* 5. Doors */}
          <AccordionItem value="item-5" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              5. Vrata
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {(() => {
                const width = useShelfStore((state) => state.width);
                const verticalBoundaries = useShelfStore(
                  (state) => state.verticalBoundaries,
                );
                const columnHorizontalBoundaries = useShelfStore(
                  (state) => state.columnHorizontalBoundaries,
                );
                const w = width / 100;
                const columns = buildBlocksX(
                  w,
                  verticalBoundaries.length > 0
                    ? verticalBoundaries
                    : undefined,
                );
                const allKeys = getCompartmentKeys(
                  columns,
                  columnHorizontalBoundaries,
                );

                const selectedDoorElementKey = useShelfStore(
                  (state) => state.selectedDoorElementKey,
                );
                const setSelectedDoorElementKey = useShelfStore(
                  (state) => state.setSelectedDoorElementKey,
                );
                const doorSelections = useShelfStore(
                  (state) => state.doorSelections,
                );
                const setDoorOption = useShelfStore(
                  (state) => state.setDoorOption,
                );
                const showDoors = useShelfStore((state) => state.showDoors);
                const setShowDoors = useShelfStore(
                  (state) => state.setShowDoors,
                );

                const options: { key: string; label: string }[] = [
                  { key: "none", label: "Bez vrata" },
                  { key: "left", label: "Leva vrata" },
                  { key: "right", label: "Desna vrata" },
                  { key: "double", label: "Dupla vrata" },
                  { key: "leftMirror", label: "Leva vrata sa ogledalom" },
                  { key: "rightMirror", label: "Desna vrata sa ogledalom" },
                  { key: "doubleMirror", label: "Dupla vrata sa ogledalom" },
                  { key: "drawerStyle", label: "Vrata kao fioka" },
                ];

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Prikaži vrata</span>
                      <Switch
                        checked={showDoors}
                        onCheckedChange={setShowDoors}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center mb-1">
                      <span className="text-sm text-muted-foreground">
                        Element:
                      </span>
                      {allKeys.map((ltr) => (
                        <Button
                          key={ltr}
                          variant={
                            selectedDoorElementKey === ltr
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setSelectedDoorElementKey(ltr)}
                          className="px-2 py-1 h-8 transition-colors"
                        >
                          {ltr}
                        </Button>
                      ))}
                    </div>

                    {!selectedDoorElementKey ? (
                      <div className="text-sm text-muted-foreground">
                        Izaberi element klikom na slovo iznad, pa izaberi tip
                        vrata.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm">
                          Odabrani: {selectedDoorElementKey}
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {options.map((opt) => {
                            const curr = doorSelections[selectedDoorElementKey];
                            const isSel = curr === (opt.key as any);
                            return (
                              <Button
                                key={opt.key}
                                variant={isSel ? "default" : "outline"}
                                onClick={() =>
                                  setDoorOption(
                                    selectedDoorElementKey,
                                    opt.key as any,
                                  )
                                }
                                className="text-sm"
                              >
                                {isSel ? "✔ " : ""}
                                {opt.label}
                              </Button>
                            );
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          (Posle ćemo definisati ponašanje svake opcije.)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleToggleAllInfo}
                  className="flex-1 hover:text-white"
                  size="sm"
                >
                  {allInfoShown ? (
                    <EyeOff className="h-4 w-4 mr-1" />
                  ) : (
                    <Eye className="h-4 w-4 mr-1" />
                  )}
                  {allInfoShown ? "Sakrij Info" : "Prikaži Info"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowDimensions(!showDimensions)}
                  className="flex-1 hover:text-white"
                  size="sm"
                >
                  {showDimensions ? (
                    <EyeOff className="h-4 w-4 mr-1" />
                  ) : (
                    <Eye className="h-4 w-4 mr-1" />
                  )}
                  {showDimensions ? "Sakrij Mere" : "Prikaži Mere"}
                </Button>
              </div>
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
          <div className="relative bg-background border rounded-lg shadow-xl w-[92vw] max-w-6xl max-h-[85vh] overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Tabela ploča (Cut list)</h3>
              <Button variant="outline" onClick={() => setShowCutList(false)}>
                Zatvori
              </Button>
            </div>
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
                          <th className="text-right py-1 pr-2">Širina (cm)</th>
                          <th className="text-right py-1 pr-2">Visina (cm)</th>
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
  const viewMode = useShelfStore((state) => state.viewMode);
  const setViewMode = useShelfStore((state) => state.setViewMode);
  // For backward compatibility with existing camera mode logic
  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
  const setCameraMode = (mode: "2D" | "3D") => setViewMode(mode);
  const showDimensions = useShelfStore((state) => state.showDimensions);
  const setShowDimensions = useShelfStore((state) => state.setShowDimensions);

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
