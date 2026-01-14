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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { signOut, useSession } from "@/lib/auth-client";
import { captureThumbnail } from "@/lib/captureThumbnail";
import { getWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { useShelfStore, type Material } from "@/lib/store";
import { AuthForms } from "./AuthForms";
import { CheckoutDialog } from "./CheckoutDialog";
import { DimensionControl } from "./DimensionControl";
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
}: {
  wardrobeRef: React.RefObject<any>;
  initialSession?: InitialSession | null;
  materials: Material[];
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

      const res = await fetch("/api/wardrobes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wardrobeName, data: snapshot, thumbnail }),
      });

      if (!res.ok) {
        console.error("[performSave] save failed", res.status);
        toast.error("Greška pri čuvanju ormana");
        return;
      }

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
    // Validate that we have materials selected
    if (!selectedMaterialId) {
      toast.error("Molimo izaberite materijal");
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
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
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
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
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
  const selectedBackMaterialId = useShelfStore(
    (state) => state.selectedBackMaterialId,
  );
  const setSelectedBackMaterialId = useShelfStore(
    (state) => state.setSelectedBackMaterialId,
  );

  const showDimensions = useShelfStore((state) => state.showDimensions);
  const setShowDimensions = useShelfStore((state) => state.setShowDimensions);
  // Base (baza) state
  const hasBase = useShelfStore((state) => state.hasBase);
  const baseHeight = useShelfStore((state) => state.baseHeight);
  const setHasBase = useShelfStore((state) => state.setHasBase);
  const setBaseHeight = useShelfStore((state) => state.setBaseHeight);

  // State for global info toggle
  const [allInfoShown, setAllInfoShown] = React.useState(false);
  const [showCutList, setShowCutList] = React.useState(false);

  // Additional store reads needed for cut list (top-level to respect Rules of Hooks)
  const elementConfigs = useShelfStore((state) => state.elementConfigs);
  const compartmentExtras = useShelfStore((state) => state.compartmentExtras);
  const doorSelections = useShelfStore((state) => state.doorSelections);

  // Precompute cut list using top-level values to avoid hooks inside conditional modal
  const cutList = React.useMemo(() => {
    try {
      const mat = materials.find(
        (m) => String(m.id) === String(selectedMaterialId),
      );
      const pricePerM2 = Number(mat?.price ?? 0);
      const t = (Number(mat?.thickness ?? 18) / 1000) as number; // m
      const doorT = 18 / 1000; // m
      const clearance = 1 / 1000; // 1mm
      const doubleGap = 3 / 1000; // 3mm between double leaves

      // Back material price and thickness (5mm)
      const backId = useShelfStore.getState().selectedBackMaterialId ?? null;
      // Find back material - by ID if selected, otherwise first material with "led" in category
      const backMat = materials.find((m) =>
        backId
          ? String(m.id) === String(backId)
          : m.category.toLowerCase().includes("led") ||
            m.category.toLowerCase().includes("leđ"),
      );
      const backPricePerM2 = Number(backMat?.price ?? 0);
      const backT = (Number(backMat?.thickness ?? 5) / 1000) as number;

      const w = width / 100;
      const h = height / 100;
      const d = depth / 100;

      const maxSegX = 100 / 100;
      const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
      const segWX = w / nBlocksX;
      const blocksX = Array.from({ length: nBlocksX }, (_, i) => {
        const start = -w / 2 + i * segWX;
        const end = start + segWX;
        return { start, end };
      });
      const targetBottomH = 200 / 100;
      const minTopH = 10 / 100;
      const modulesY: { yStart: number; yEnd: number }[] = [];
      if (h > 200 / 100) {
        const yStartBottom = -h / 2;
        const bottomH =
          h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
        const yEndBottom = yStartBottom + bottomH;
        const yStartTop = yEndBottom;
        const yEndTop = h / 2;
        modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
        modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
      } else {
        modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
      }
      const toLetters = (num: number) => {
        let n = num + 1;
        let s = "";
        while (n > 0) {
          const rem = (n - 1) % 26;
          s = String.fromCharCode(65 + rem) + s;
          n = Math.floor((n - 1) / 26);
        }
        return s;
      };

      type Item = {
        code: string;
        desc: string;
        widthCm: number;
        heightCm: number;
        thicknessMm: number;
        areaM2: number;
        cost: number;
        element: string;
      };

      const items: Item[] = [];

      let idx = 0;
      modulesY.forEach((m, mIdx) => {
        const moduleH = m.yEnd - m.yStart;
        const doorH = Math.max(moduleH - clearance, 0);
        blocksX.forEach((bx) => {
          const letter = toLetters(idx);
          const elemW = bx.end - bx.start;
          const innerStartX = bx.start + t;
          const innerEndX = bx.end - t;
          const innerW = Math.max(innerEndX - innerStartX, 0);
          const suffix = `.${mIdx + 1}`;
          const yStartInner = m.yStart + t;
          const yEndInner = m.yEnd - t;
          const _innerH = Math.max(yEndInner - yStartInner, 0);

          // Sides
          const sideW = d;
          const sideH = moduleH;
          const sideArea = sideW * sideH;
          items.push({
            code: `A${letter}L${suffix}`,
            desc: `Leva stranica elementa ${letter}${suffix}`,
            widthCm: sideW * 100,
            heightCm: sideH * 100,
            thicknessMm: t * 1000,
            areaM2: sideArea,
            cost: sideArea * pricePerM2,
            element: letter,
          });
          items.push({
            code: `A${letter}D${suffix}`,
            desc: `Desna stranica elementa ${letter}${suffix}`,
            widthCm: sideW * 100,
            heightCm: sideH * 100,
            thicknessMm: t * 1000,
            areaM2: sideArea,
            cost: sideArea * pricePerM2,
            element: letter,
          });

          // Shelves per compartment
          const cfg = elementConfigs[letter] ?? { columns: 1, rowCounts: [0] };
          const cols = Math.max(1, (cfg.columns as number) | 0);
          const xs: number[] = [innerStartX];
          for (let c = 1; c <= cols - 1; c++)
            xs.push(innerStartX + (innerW * c) / cols);
          xs.push(innerEndX);
          const compWidths = xs.slice(0, -1).map((x0, cIdx) => {
            const x1 = xs[cIdx + 1];
            const left = x0 + (cIdx === 0 ? 0 : t / 2);
            const right = x1 - (cIdx === cols - 1 ? 0 : t / 2);
            return Math.max(right - left, 0);
          });
          let shelfSerial = 0;
          compWidths.forEach((compW, cIdx) => {
            const count = Math.max(
              0,
              Math.floor((cfg.rowCounts as number[] | undefined)?.[cIdx] ?? 0),
            );
            for (let s = 0; s < count; s++) {
              shelfSerial += 1;
              const area = compW * d;
              items.push({
                code: `A${letter}P.${shelfSerial}`,
                desc: `Polica ${letter} (komora ${cIdx + 1})`,
                widthCm: compW * 100,
                heightCm: d * 100,
                thicknessMm: t * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }
          });

          // Top and Bottom panels per element (like CarcassFrame)
          const innerLenX = Math.max(elemW - 2 * t, 0);
          if (innerLenX > 0) {
            const areaBot = innerLenX * d;
            items.push({
              code: `A${letter}B${suffix}`,
              desc: `Donja ploča ${letter}${suffix}`,
              widthCm: innerLenX * 100,
              heightCm: d * 100,
              thicknessMm: t * 1000,
              areaM2: areaBot,
              cost: areaBot * pricePerM2,
              element: letter,
            });
            const areaTop = innerLenX * d;
            items.push({
              code: `A${letter}G${suffix}`,
              desc: `Gornja ploča ${letter}${suffix}`,
              widthCm: innerLenX * 100,
              heightCm: d * 100,
              thicknessMm: t * 1000,
              areaM2: areaTop,
              cost: areaTop * pricePerM2,
              element: letter,
            });
          }

          // Internal vertical dividers from elementConfigs (between compartments)
          if (cols > 1) {
            // Compute drawers region to shorten divider height (same approach as CarcassFrame)
            const extrasForEl = compartmentExtras[
              letter as keyof typeof compartmentExtras
            ] as any;
            const drawerH = 10 / 100; // 10cm
            const gap = 1 / 100; // 1cm
            const per = drawerH + gap;
            const raiseByBase =
              hasBase && (modulesY.length === 1 || mIdx === 0)
                ? baseHeight / 100
                : 0;
            const drawersYStart = yStartInner + raiseByBase;
            const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
            const maxAuto = Math.max(
              0,
              Math.floor((innerHForDrawers + gap) / per),
            );
            const countFromState = Math.max(
              0,
              Math.floor(extrasForEl?.drawersCount ?? 0),
            );
            const usedDrawerCount = extrasForEl?.drawers
              ? countFromState > 0
                ? Math.min(countFromState, maxAuto)
                : maxAuto
              : 0;
            const drawersTopY =
              usedDrawerCount > 0
                ? drawersYStart + drawerH + (usedDrawerCount - 1) * per
                : 0;
            const autoShelfExists =
              usedDrawerCount > 0 &&
              usedDrawerCount < maxAuto &&
              yEndInner - (drawersTopY + gap) >= t;
            let yDivFrom = yStartInner;
            if (usedDrawerCount > 0) {
              const baseFrom = drawersTopY + gap + (autoShelfExists ? t : 0);
              yDivFrom = Math.min(Math.max(baseFrom, yStartInner), yEndInner);
            }
            const hDiv = Math.max(yEndInner - yDivFrom, 0);
            if (hDiv > 0) {
              for (let c = 1; c <= cols - 1; c++) {
                const area = d * hDiv;
                items.push({
                  code: `A${letter}VD.${c}${suffix}`,
                  desc: `Vertikalni divider ${letter} (između komora ${c}/${c + 1})`,
                  widthCm: d * 100,
                  heightCm: hDiv * 100,
                  thicknessMm: t * 1000,
                  areaM2: area,
                  cost: area * pricePerM2,
                  element: letter,
                });
              }
            }
          }

          // Doors
          const sel = doorSelections[
            letter as keyof typeof doorSelections
          ] as any;
          if (sel && sel !== "none") {
            const totalAvailW = Math.max(elemW - clearance, 0);
            if (sel === "double" || sel === "doubleMirror") {
              const leafW = Math.max((totalAvailW - doubleGap) / 2, 0);
              const area = leafW * doorH;
              items.push({
                code: `A${letter}V.L${suffix}`,
                desc: `Vrata leva ${letter}${suffix}`,
                widthCm: leafW * 100,
                heightCm: doorH * 100,
                thicknessMm: doorT * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
              items.push({
                code: `A${letter}V.D${suffix}`,
                desc: `Vrata desna ${letter}${suffix}`,
                widthCm: leafW * 100,
                heightCm: doorH * 100,
                thicknessMm: doorT * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            } else {
              const leafW = totalAvailW;
              const area = leafW * doorH;
              const isLeft = sel === "left" || sel === "leftMirror";
              const codeSuffix = isLeft
                ? "L"
                : sel === "right" || sel === "rightMirror"
                  ? "D"
                  : "";
              items.push({
                code: `A${letter}V.${codeSuffix}${suffix}`,
                desc: `Vrata ${isLeft ? "leva" : codeSuffix === "D" ? "desna" : "jednokrilna"} ${letter}${suffix}`,
                widthCm: leafW * 100,
                heightCm: doorH * 100,
                thicknessMm: doorT * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }
          }

          // Extras center vertical divider (from Extras menu)
          {
            const extras = compartmentExtras[
              letter as keyof typeof compartmentExtras
            ] as any;
            if (extras?.verticalDivider) {
              const drawerH = 10 / 100;
              const gap = 1 / 100;
              const per = drawerH + gap;
              const raiseByBase =
                hasBase && (modulesY.length === 1 || mIdx === 0)
                  ? baseHeight / 100
                  : 0;
              const drawersYStart = yStartInner + raiseByBase;
              const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
              const maxAuto = Math.max(
                0,
                Math.floor((innerHForDrawers + gap) / per),
              );
              const countFromState = Math.max(
                0,
                Math.floor(extras?.drawersCount ?? 0),
              );
              const usedDrawerCount = extras?.drawers
                ? countFromState > 0
                  ? Math.min(countFromState, maxAuto)
                  : maxAuto
                : 0;
              const drawersTopY =
                usedDrawerCount > 0
                  ? drawersYStart + drawerH + (usedDrawerCount - 1) * per
                  : 0;
              const autoShelfExists =
                usedDrawerCount > 0 &&
                usedDrawerCount < maxAuto &&
                yEndInner - (drawersTopY + gap) >= t;
              let yDivFrom = yStartInner;
              if (usedDrawerCount > 0) {
                const baseFrom = drawersTopY + gap + (autoShelfExists ? t : 0);
                yDivFrom = Math.min(Math.max(baseFrom, yStartInner), yEndInner);
              }
              const hDiv = Math.max(yEndInner - yDivFrom, 0);
              if (hDiv > 0) {
                const area = d * hDiv;
                items.push({
                  code: `A${letter}VD.C${suffix}`,
                  desc: `Vertikalni divider (srednji) ${letter}${suffix}`,
                  widthCm: d * 100,
                  heightCm: hDiv * 100,
                  thicknessMm: t * 1000,
                  areaM2: area,
                  cost: area * pricePerM2,
                  element: letter,
                });
              }
            }
          }

          // Drawers
          const extras = compartmentExtras[
            letter as keyof typeof compartmentExtras
          ] as any;
          if (extras?.drawers) {
            const drawerH = 10 / 100;
            const gap = 1 / 100;
            const per = drawerH + gap;
            const yStartInner = m.yStart + t;
            const yEndInner = m.yEnd - t;
            const raiseByBase =
              hasBase && (modulesY.length === 1 || mIdx === 0)
                ? baseHeight / 100
                : 0;
            const drawersYStart = yStartInner + raiseByBase;
            const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
            const maxAuto = Math.max(
              0,
              Math.floor((innerHForDrawers + gap) / per),
            );
            const countFromState = Math.max(
              0,
              Math.floor(extras.drawersCount ?? 0),
            );
            const used =
              countFromState > 0 ? Math.min(countFromState, maxAuto) : maxAuto;
            for (let i = 0; i < used; i++) {
              const area = innerW * drawerH;
              items.push({
                code: `A${letter}F.${i + 1}${suffix}`,
                desc: `Fioka ${letter}${suffix}`,
                widthCm: innerW * 100,
                heightCm: drawerH * 100,
                thicknessMm: t * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }

            // Auto-shelf directly above drawers if they don't fill full available height
            if (used > 0 && used < maxAuto) {
              const drawersTopY = drawersYStart + drawerH + (used - 1) * per;
              const shelfPlaneY = drawersTopY + gap; // bottom plane of the shelf
              const remaining = yEndInner - shelfPlaneY;
              if (remaining >= t) {
                const area = innerW * d;
                items.push({
                  code: `A${letter}P.A${suffix}`,
                  desc: `Polica iznad fioka ${letter}${suffix}`,
                  widthCm: innerW * 100,
                  heightCm: d * 100,
                  thicknessMm: t * 1000,
                  areaM2: area,
                  cost: area * pricePerM2,
                  element: letter,
                });
              }
            }
          }

          // Back panel per element: use FULL element size (elemW/moduleH), minus 2mm total clearance
          {
            const clearanceBack = 2 / 1000; // 2mm
            const backW = Math.max(elemW - clearanceBack, 0);
            const backH = Math.max(moduleH - clearanceBack, 0);
            if (backW > 0 && backH > 0) {
              const area = backW * backH;
              items.push({
                code: `A${letter}Z${suffix}`,
                desc: `Zadnji panel ${letter}${suffix}`,
                widthCm: backW * 100,
                heightCm: backH * 100,
                thicknessMm: backT * 1000,
                areaM2: area,
                cost: area * backPricePerM2,
                element: letter,
              });
            }
          }

          idx += 1;
        });
      });

      const totalArea = items.reduce((a, b) => a + b.areaM2, 0);
      const totalCost = items.reduce((a, b) => a + b.cost, 0);
      const grouped = items.reduce((acc: Record<string, Item[]>, it) => {
        (acc[it.element] = acc[it.element] || []).push(it);
        return acc;
      }, {});

      return { items, grouped, totalArea, totalCost, pricePerM2 };
    } catch (_e) {
      return {
        items: [],
        grouped: {},
        totalArea: 0,
        totalCost: 0,
        pricePerM2: 0,
      } as {
        items: any[];
        grouped: Record<string, any[]>;
        totalArea: number;
        totalCost: number;
        pricePerM2: number;
      };
    }
  }, [
    width,
    height,
    depth,
    selectedMaterialId,
    elementConfigs,
    compartmentExtras,
    hasBase,
    baseHeight,
    doorSelections,
  ]);

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
      const maxSegX = 100; // cm per block
      const nBlocksX = Math.max(1, Math.ceil(widthCm / maxSegX));
      const hasSplitY = heightCm > 200;
      const minTopH = 10; // cm
      let bottomModuleCm = Math.min(200, heightCm);
      const topModuleCm = hasSplitY ? Math.max(minTopH, heightCm - 200) : 0;
      if (hasSplitY && heightCm - 200 < minTopH) {
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
        const appliesBase = hasBase && (heightCm <= 200 || rowIdx === 0);
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
          const drawerHcm = 10; // 10cm each
          const gapCm = 1; // 1cm gap between
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
    // Always reset overlays to hidden on structure change
    if (wardrobeRef?.current?.toggleAllInfo) {
      wardrobeRef.current.toggleAllInfo(false);
    }
  }, [rowCounts, wardrobeRef]);

  const handleToggleAllInfo = () => {
    if (wardrobeRef?.current?.toggleAllInfo) {
      wardrobeRef.current.toggleAllInfo(!allInfoShown);
      setAllInfoShown((prev) => !prev);
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
          defaultValue="item-1"
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
              {/* Per-element selection and controls */}
              {(() => {
                // Compute elements (letters) in the same order as CarcassFrame: bottom-to-top, left-to-right
                const w = useShelfStore.getState().width / 100;
                const h = useShelfStore.getState().height / 100;
                const maxSegX = 100 / 100;
                const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
                const letters: string[] = [];
                const toLetters = (num: number) => {
                  let n = num + 1;
                  let s = "";
                  while (n > 0) {
                    const rem = (n - 1) % 26;
                    s = String.fromCharCode(65 + rem) + s;
                    n = Math.floor((n - 1) / 26);
                  }
                  return s;
                };
                const minTopH = 10 / 100;
                const targetBottomH = 200 / 100;
                const hasSplitY = h > 200 / 100; // split when > 200cm
                const _topH = hasSplitY
                  ? h - targetBottomH < minTopH
                    ? minTopH
                    : h - targetBottomH
                  : 0;
                const nModulesY = hasSplitY ? 2 : 1;
                const totalElements = nBlocksX * nModulesY;
                for (let i = 0; i < totalElements; i++)
                  letters.push(toLetters(i));

                const selectedElementKey = useShelfStore(
                  (state) => state.selectedElementKey,
                );
                const setSelectedElementKey = useShelfStore(
                  (state) => state.setSelectedElementKey,
                );
                const elementConfigs = useShelfStore(
                  (state) => state.elementConfigs,
                );
                const setElementColumns = useShelfStore(
                  (state) => state.setElementColumns,
                );
                const setElementRowCount = useShelfStore(
                  (state) => state.setElementRowCount,
                );

                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm text-muted-foreground">
                        Element:
                      </span>
                      {letters.map((ltr, _idx) => (
                        <Button
                          key={ltr}
                          variant={
                            selectedElementKey === ltr ? "default" : "outline"
                          }
                          onClick={() => setSelectedElementKey(ltr)}
                          className="px-2 py-1 h-8  transition-colors"
                        >
                          {ltr}
                        </Button>
                      ))}
                    </div>

                    {selectedElementKey && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Pregrade (vertikalne)</span>
                          <span className="text-xs text-muted-foreground">
                            {elementConfigs[selectedElementKey]?.columns ?? 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const curr =
                                elementConfigs[selectedElementKey]?.columns ??
                                1;
                              setElementColumns(
                                selectedElementKey,
                                Math.max(curr - 1, 1),
                              );
                            }}
                            className="px-2"
                          >
                            –
                          </Button>
                          <Slider
                            min={1}
                            max={8}
                            step={1}
                            value={[
                              elementConfigs[selectedElementKey]?.columns ?? 1,
                            ]}
                            onValueChange={([val]) =>
                              setElementColumns(selectedElementKey, val)
                            }
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const curr =
                                elementConfigs[selectedElementKey]?.columns ??
                                1;
                              setElementColumns(
                                selectedElementKey,
                                Math.min(curr + 1, 8),
                              );
                            }}
                            className="px-2"
                          >
                            +
                          </Button>
                        </div>

                        {/* Shelf sliders per compartment */}
                        <div className="space-y-2">
                          {Array.from({
                            length:
                              elementConfigs[selectedElementKey]?.columns ?? 1,
                          }).map((_, idx) => {
                            const count =
                              elementConfigs[selectedElementKey]?.rowCounts?.[
                                idx
                              ] ?? 0;
                            return (
                              <div
                                key={idx}
                                className="flex items-center space-x-2"
                              >
                                <span className="text-xs text-muted-foreground">
                                  Police u pregradi {idx + 1}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    setElementRowCount(
                                      selectedElementKey,
                                      idx,
                                      Math.max(count - 1, 0),
                                    )
                                  }
                                  disabled={count <= 0}
                                  className="px-2"
                                >
                                  –
                                </Button>
                                <Slider
                                  min={0}
                                  max={10}
                                  step={1}
                                  value={[count]}
                                  onValueChange={([val]) =>
                                    setElementRowCount(
                                      selectedElementKey,
                                      idx,
                                      val,
                                    )
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    setElementRowCount(
                                      selectedElementKey,
                                      idx,
                                      Math.min(count + 1, 10),
                                    )
                                  }
                                  disabled={count >= 10}
                                  className="px-2"
                                >
                                  +
                                </Button>
                                <span className="text-xs w-10 text-right">
                                  {count}{" "}
                                  {count === 1
                                    ? "polica"
                                    : count >= 2 && count <= 4
                                      ? "police"
                                      : "polica"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </AccordionContent>
          </AccordionItem>

          {/* 4. Base (Baza) */}
          <AccordionItem value="item-4" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              4. Baza
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="chk-base"
                  checked={hasBase}
                  onCheckedChange={setHasBase}
                />
                <label
                  htmlFor="chk-base"
                  className="text-sm select-none cursor-pointer"
                >
                  Uključi bazu (donja pregrada)
                </label>
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
                    onClick={() => setBaseHeight(Math.max(baseHeight - 1, 0))}
                    disabled={!hasBase}
                    className="px-2"
                  >
                    –
                  </Button>
                  <Slider
                    min={0}
                    max={15}
                    step={1}
                    value={[baseHeight]}
                    onValueChange={([val]) => setBaseHeight(val)}
                    disabled={!hasBase}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setBaseHeight(Math.min(baseHeight + 1, 20))}
                    disabled={!hasBase}
                    className="px-2"
                  >
                    +
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              3. Izbor materijala
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pt-4">
              {/* Group materials by category */}
              {(() => {
                const categories = [
                  ...new Set(materials.map((m) => m.category)),
                ];
                return categories.map((category) => {
                  const categoryMaterials = materials.filter(
                    (m) => m.category === category,
                  );
                  // Determine if this is a "back" category (ledja)
                  // TODO: WHAT IS THIS?
                  const isBackCategory =
                    category.toLowerCase().includes("led") ||
                    category.toLowerCase().includes("leđ");
                  const selectedId = isBackCategory
                    ? selectedBackMaterialId
                    : selectedMaterialId;
                  const setSelectedId = isBackCategory
                    ? setSelectedBackMaterialId
                    : setSelectedMaterialId;

                  return (
                    <div key={category}>
                      <h4 className="text-sm font-semibold mb-2">{category}</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {categoryMaterials.map((material) => (
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
                              } hover:border-primary h-24 w-full bg-cover bg-center bg-muted`}
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
                            <span className="text-sm mt-1 text-center">
                              {material.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </AccordionContent>
          </AccordionItem>
          {/* 5. Extras */}
          <AccordionItem value="item-5" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              5. Dodaci
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {(() => {
                // Prava reaktivna veza na Zustand store
                const extrasMode = useShelfStore((state) => state.extrasMode);
                const setExtrasMode = useShelfStore(
                  (state) => state.setExtrasMode,
                );
                const selectedCompartmentKey = useShelfStore(
                  (state) => state.selectedCompartmentKey,
                );
                const setSelectedCompartmentKey = useShelfStore(
                  (state) => state.setSelectedCompartmentKey,
                );
                const compartmentExtras = useShelfStore(
                  (state) => state.compartmentExtras,
                );
                const toggleCompVerticalDivider = useShelfStore(
                  (state) => state.toggleCompVerticalDivider,
                );
                const toggleCompDrawers = useShelfStore(
                  (state) => state.toggleCompDrawers,
                );
                const toggleCompRod = useShelfStore(
                  (state) => state.toggleCompRod,
                );
                const toggleCompLed = useShelfStore(
                  (state) => state.toggleCompLed,
                );

                // Prikaz svih slova (A, B, C, ...) prema broju elemenata na crtežu
                // Identicno kao u CarcassFrame elementLabels: blokovi po 100cm (X) i moduli po visini (Y)
                const width = useShelfStore((state) => state.width);
                const height = useShelfStore((state) => state.height);
                const w = width / 100;
                const h = height / 100;
                const maxSegX = 100 / 100;
                const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
                const hasSplitY = h > 200 / 100;
                const nModulesY = hasSplitY ? 2 : 1;
                const toLetters = (num: number) => {
                  let n = num + 1;
                  let s = "";
                  while (n > 0) {
                    const rem = (n - 1) % 26;
                    s = String.fromCharCode(65 + rem) + s;
                    n = Math.floor((n - 1) / 26);
                  }
                  return s;
                };
                const allKeys = Array.from(
                  { length: nBlocksX * nModulesY },
                  (_, i) => toLetters(i),
                );

                // Prikaz stanja za selektovani element
                const extras = selectedCompartmentKey
                  ? compartmentExtras[selectedCompartmentKey] || {}
                  : {};

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Režim selekcije</span>
                      <Switch
                        checked={extrasMode}
                        onCheckedChange={setExtrasMode}
                      />
                    </div>

                    {!extrasMode ? (
                      <div className="text-sm text-muted-foreground">
                        Uključite režim selekcije da biste mogli da izaberete
                        elemente i dodate dodatke.
                      </div>
                    ) : (
                      <>
                        {/* Element selection row for extras */}
                        <div className="flex flex-wrap gap-2 items-center mb-2">
                          <span className="text-sm text-muted-foreground">
                            Element:
                          </span>
                          {allKeys.map((ltr) => (
                            <Button
                              key={ltr}
                              variant={
                                selectedCompartmentKey === ltr
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => setSelectedCompartmentKey(ltr)}
                              className="px-2 py-1 h-8  transition-colors"
                            >
                              {ltr}
                            </Button>
                          ))}
                        </div>
                        {!selectedCompartmentKey ? (
                          <div className="text-sm text-muted-foreground">
                            Izaberi element klikom na slovo iznad, pa dodaj
                            dodatke.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-sm">
                              Odabrani: {selectedCompartmentKey}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <Button
                                variant={
                                  extras.verticalDivider ? "default" : "outline"
                                }
                                onClick={() =>
                                  toggleCompVerticalDivider(
                                    selectedCompartmentKey,
                                  )
                                }
                                className=" transition-colors"
                              >
                                {extras.verticalDivider ? "✔ " : ""}+ Vertikalni
                                divider
                              </Button>
                              {/* Drawers button + count selector together */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={
                                    extras.drawers ? "default" : "outline"
                                  }
                                  onClick={() =>
                                    toggleCompDrawers(selectedCompartmentKey)
                                  }
                                  className="flex-1 transition-colors"
                                >
                                  {extras.drawers ? "✔ " : ""}+ Fioke
                                </Button>
                                {(() => {
                                  const width = useShelfStore.getState().width;
                                  const height =
                                    useShelfStore.getState().height;
                                  const selectedMaterialId =
                                    useShelfStore.getState()
                                      .selectedMaterialId as number;
                                  const mat = materials.find(
                                    (m) =>
                                      String(m.id) ===
                                      String(selectedMaterialId),
                                  );
                                  const thicknessMm = mat?.thickness ?? 18; // mm
                                  const t = thicknessMm / 1000; // world units (m)
                                  const w = width / 100;
                                  const h = height / 100;
                                  const maxSegX = 100 / 100;
                                  const nBlocksX = Math.max(
                                    1,
                                    Math.ceil(w / maxSegX),
                                  );
                                  const segWX = w / nBlocksX;
                                  const targetBottomH = 200 / 100;
                                  const minTopH = 10 / 100;
                                  const modulesY: {
                                    yStart: number;
                                    yEnd: number;
                                  }[] = [];
                                  if (h > 200 / 100) {
                                    const yStartBottom = -h / 2;
                                    const bottomH =
                                      h - targetBottomH < minTopH
                                        ? h - minTopH
                                        : targetBottomH;
                                    const yEndBottom = yStartBottom + bottomH;
                                    const yStartTop = yEndBottom;
                                    const yEndTop = h / 2;
                                    modulesY.push({
                                      yStart: yStartBottom,
                                      yEnd: yEndBottom,
                                    });
                                    modulesY.push({
                                      yStart: yStartTop,
                                      yEnd: yEndTop,
                                    });
                                  } else {
                                    modulesY.push({
                                      yStart: -h / 2,
                                      yEnd: h / 2,
                                    });
                                  }
                                  const toLetters = (num: number) => {
                                    let n = num + 1;
                                    let s = "";
                                    while (n > 0) {
                                      const rem = (n - 1) % 26;
                                      s = String.fromCharCode(65 + rem) + s;
                                      n = Math.floor((n - 1) / 26);
                                    }
                                    return s;
                                  };
                                  const blocksX = Array.from(
                                    { length: nBlocksX },
                                    (_, i) => {
                                      const start = -w / 2 + i * segWX;
                                      const end = start + segWX;
                                      return { start, end };
                                    },
                                  );
                                  let idx = 0;
                                  let innerHForDrawers = 0;
                                  let found = false;
                                  modulesY.forEach((m, mIdx) => {
                                    blocksX.forEach((_bx) => {
                                      const letter = toLetters(idx);
                                      if (
                                        !found &&
                                        letter === selectedCompartmentKey
                                      ) {
                                        const yStartInner = m.yStart + t;
                                        const yEndInner = m.yEnd - t;
                                        const raiseByBase =
                                          hasBase &&
                                          (modulesY.length === 1 || mIdx === 0)
                                            ? baseHeight / 100
                                            : 0;
                                        const drawersYStart =
                                          yStartInner + raiseByBase;
                                        innerHForDrawers = Math.max(
                                          yEndInner - drawersYStart,
                                          0,
                                        );
                                        found = true;
                                      }
                                      idx += 1;
                                    });
                                  });
                                  const drawerH = 10 / 100; // 10cm
                                  const gap = 1 / 100; // 1cm
                                  const maxCount = Math.max(
                                    0,
                                    Math.floor(
                                      (innerHForDrawers + gap) /
                                        (drawerH + gap),
                                    ),
                                  );
                                  const current = extras.drawersCount ?? 0;
                                  const options = [] as number[];
                                  for (let i = 0; i <= maxCount; i++)
                                    options.push(i);
                                  if (current > maxCount) options.push(current);

                                  return (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="outline"
                                          disabled={
                                            !selectedCompartmentKey ||
                                            !extras.drawers
                                          }
                                          className="w-16"
                                        >
                                          {current}
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {options.map((n) => (
                                          <DropdownMenuItem
                                            key={n}
                                            onClick={() => {
                                              useShelfStore
                                                .getState()
                                                .setCompDrawersCount(
                                                  selectedCompartmentKey!,
                                                  n,
                                                );
                                            }}
                                          >
                                            {n}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  );
                                })()}
                              </div>
                              <Button
                                variant={extras.rod ? "default" : "outline"}
                                onClick={() =>
                                  toggleCompRod(selectedCompartmentKey)
                                }
                                className=" transition-colors"
                              >
                                {extras.rod ? "✔ " : ""}+ Šipka za ofingere
                              </Button>
                              <Button
                                variant={extras.led ? "default" : "outline"}
                                onClick={() =>
                                  toggleCompLed(selectedCompartmentKey)
                                }
                                className=" transition-colors"
                              >
                                {extras.led ? "✔ " : ""}LED rasveta
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </AccordionContent>
          </AccordionItem>
          {/* 6. Doors */}
          <AccordionItem value="item-6" className="border-border">
            <AccordionTrigger className="text-base font-bold hover:no-underline">
              6. Vrata
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {(() => {
                const width = useShelfStore((state) => state.width);
                const height = useShelfStore((state) => state.height);
                const w = width / 100;
                const h = height / 100;
                const maxSegX = 100 / 100;
                const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
                const hasSplitY = h > 200 / 100;
                const nModulesY = hasSplitY ? 2 : 1;
                const toLetters = (num: number) => {
                  let n = num + 1;
                  let s = "";
                  while (n > 0) {
                    const rem = (n - 1) % 26;
                    s = String.fromCharCode(65 + rem) + s;
                    n = Math.floor((n - 1) / 26);
                  }
                  return s;
                };
                const allKeys = Array.from(
                  { length: nBlocksX * nModulesY },
                  (_, i) => toLetters(i),
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
                Sačuvaj
              </Button>
              <Button
                variant="default"
                onClick={handleOrderClick}
                className="flex-1"
                size="lg"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Poruči
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
                  className="w-full justify-start"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Specifikacija elemenata
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
          <span className="text-base font-bold">Poruči</span>
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
              ?.name ?? "Nepoznat materijal",
          backMaterialId: selectedBackMaterialId ?? null,
          backMaterialName: selectedBackMaterialId
            ? (materials.find(
                (m) => String(m.id) === String(selectedBackMaterialId),
              )?.name ?? null)
            : null,
          totalArea: Math.round(cutList.totalArea * 10000), // Convert m² to cm²
          totalPrice: cutList.totalCost,
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
