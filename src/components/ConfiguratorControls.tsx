"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  LogOut,
  MessageSquare,
  Settings,
  ShoppingCart,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import posthog from "posthog-js";
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
import { signOut, useSession } from "@/lib/auth-client";
import { captureThumbnail } from "@/lib/captureThumbnail";
import { calculateCutList } from "@/lib/calcCutList";
import { getWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
import { exportElementSpecs } from "@/lib/pdf/exportElementSpecs";
import { exportCutListPDF } from "@/lib/pdf/exportCutListPDF";
import { AuthForms } from "./AuthForms";
import { CheckoutDialog } from "./CheckoutDialog";
import {
  StepDimensions,
  StepColumns,
  StepMaterials,
  StepBase,
  StepDoors,
  StepAccessories,
  StepActions,
  StepFooter,
} from "./configurator-steps";
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

    const { setIsSaving, setLastSaveTime } = useShelfStore.getState();
    setIsSaving(true);

    try {
      const snapshot = getWardrobeSnapshot();
      if (!snapshot || typeof snapshot !== "object") {
        console.error("[performSave] invalid snapshot", snapshot);
        toast.error(
          "Nije moguće pripremiti podatke ormana. Osvežite stranicu i pokušajte ponovo.",
        );
        setIsSaving(false);
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
          const errorMsg =
            res.status === 404
              ? "Orman nije pronađen. Možda je već obrisan."
              : res.status === 403
                ? "Nemate dozvolu za izmenu ovog ormana."
                : "Nije moguće ažurirati orman. Proverite internet konekciju.";
          toast.error(errorMsg);
          setIsSaving(false);
          return;
        }

        // Mark as saved for unsaved changes detection
        useShelfStore.getState().setLastSavedSnapshot(snapshot);
        setLastSaveTime(Date.now());

        posthog.capture("design_saved", {
          wardrobe_id: loadedWardrobeId,
          is_new: false,
          wardrobe_name: wardrobeName,
        });

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
        setIsSaving(false);
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
        const errorMsg =
          res.status === 401
            ? "Niste prijavljeni. Prijavite se i pokušajte ponovo."
            : res.status === 413
              ? "Orman je previše velik za čuvanje. Smanjite kompleksnost dizajna."
              : "Nije moguće sačuvati orman. Proverite internet konekciju.";
        toast.error(errorMsg);
        setIsSaving(false);
        return;
      }

      // Clear loaded wardrobe since we created a new one
      clearLoadedWardrobe();

      // Mark as saved for unsaved changes detection
      useShelfStore.getState().setLastSavedSnapshot(snapshot);
      setLastSaveTime(Date.now());

      posthog.capture("design_saved", {
        is_new: true,
        wardrobe_name: wardrobeName,
      });

      toast.success(`"${wardrobeName}" je sačuvan`, {
        action: {
          label: "Pogledaj",
          onClick: () => router.push("/wardrobes"),
        },
      });
      setSaveDialogOpen(false);
      setIsSaving(false);
    } catch (e) {
      console.error("[performSave] exception", e);
      toast.error(
        "Neočekivana greška pri čuvanju. Proverite internet konekciju i pokušajte ponovo.",
      );
      setIsSaving(false);
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
  const isSaving = useShelfStore((state: ShelfState) => state.isSaving);
  const lastSaveTime = useShelfStore((state: ShelfState) => state.lastSaveTime);

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

  // Base (baza) state - needed for cutList
  const hasBase = useShelfStore((state: ShelfState) => state.hasBase);
  const baseHeight = useShelfStore((state: ShelfState) => state.baseHeight);

  // Accordion step state (for controlled accordion)
  const activeAccordionStep = useShelfStore(
    (state: ShelfState) => state.activeAccordionStep,
  );
  const setActiveAccordionStep = useShelfStore(
    (state: ShelfState) => state.setActiveAccordionStep,
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
  const storeAccessories = useShelfStore(
    (state: ShelfState) => state.accessories,
  );
  const selectedAccessories = useShelfStore(
    (state: ShelfState) => state.selectedAccessories,
  );
  const doorSettingsMode = useShelfStore(
    (state: ShelfState) => state.doorSettingsMode,
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
          columnTopModuleShelves,
          // Door groups and handle settings for pricing
          doorGroups,
          globalHandleId,
          globalHandleFinish,
          doorSettingsMode,
          // Accessory selections
          selectedAccessories,
        },
        materials,
        storeHandles,
        storeAccessories,
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
      storeAccessories,
      selectedAccessories,
      // Structural boundaries
      verticalBoundaries,
      columnHorizontalBoundaries,
      columnModuleBoundaries,
      columnTopModuleShelves,
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
    exportElementSpecs(cutList, fmt2, materials, storeHandles);
  }, [cutList, fmt2, materials, storeHandles]);

  // Export cut list tables to PDF (simpler version without schematic drawings)
  const handleExportCutListPDF = React.useCallback(() => {
    exportCutListPDF(cutList, fmt2);
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

              <DropdownMenuItem asChild>
                <Link href="/contact" className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Kontakt
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
            <AccordionContent>
              <StepDimensions />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              2. Kolone i Pregrade
            </AccordionTrigger>
            <AccordionContent>
              <StepColumns materials={materials} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              3. Izbor materijala
            </AccordionTrigger>
            <AccordionContent>
              <StepMaterials materials={materials} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              4. Baza
            </AccordionTrigger>
            <AccordionContent>
              <StepBase />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              5. Vrata
            </AccordionTrigger>
            <AccordionContent>
              <StepDoors />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              6. Dodaci
            </AccordionTrigger>
            <AccordionContent>
              <StepAccessories />
            </AccordionContent>
          </AccordionItem>

          <StepActions
            onSaveClick={handleSaveClick}
            onShowCutList={() => setShowCutList(true)}
            onExportElementSpecs={handleExportElementSpecs}
            onDownloadFrontView={handleDownloadFrontView}
            onDownloadFrontEdges={handleDownloadFrontEdges}
            onDownloadTechnical2D={handleDownloadTechnical2D}
          />
        </Accordion>
      </div>

      <StepFooter
        totalArea={cutList.totalArea}
        totalCost={cutList.totalCost}
        onOrderClick={handleOrderClick}
        fmt2={fmt2}
      />

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
              <h3 className="text-lg font-semibold">Tabela ploča</h3>
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
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={isSaving}
            >
              Otkaži
            </Button>
            <Button onClick={performSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Čuvanje...
                </>
              ) : (
                "Sačuvaj"
              )}
            </Button>
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
        {showDimensions ? "Sakrij mere" : "Prikaži mere"}
      </Button>
    </div>
  );
}
