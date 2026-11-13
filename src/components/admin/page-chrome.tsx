"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// The pieces every admin record page is built from, so they all look and
// behave the same: the save button in the top bar, a header with the way
// back, titled cards, and delete at the bottom, away from save.

/** The place in the admin's top bar where a page puts its save button. */
export const TopBarSlot = createContext<HTMLElement | null>(null);

interface SaveBarProps {
  /** Something on the page differs from what is saved. */
  dirty: boolean;
  saving: boolean;
  /** Id of the form this submits. Leave out and pass `onSave` instead. */
  form?: string;
  onSave?: () => void;
  label?: string;
}

/**
 * The page's save button. It sits in the top bar, which stays on screen, so
 * it is in the same place on every page and never needs scrolling. Disabled
 * until something changed.
 */
export function SaveBar({
  dirty,
  saving,
  form,
  onSave,
  label = "Sačuvaj",
}: SaveBarProps) {
  const slot = useContext(TopBarSlot);
  if (!slot) return null;
  return createPortal(
    <>
      {dirty && !saving && (
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Nesačuvane izmene
        </span>
      )}
      <Button
        type={form ? "submit" : "button"}
        form={form}
        onClick={onSave}
        disabled={saving || !dirty}
        size="sm"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        {label}
      </Button>
    </>,
    slot,
  );
}

interface PageHeaderProps {
  backHref: string;
  title: string;
  /** What belongs beside the title: the record's status. */
  children?: ReactNode;
}

export function PageHeader({ backHref, title, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={backHref} aria-label="Nazad">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="min-w-0 break-words text-xl font-semibold leading-tight sm:text-2xl">
          {title}
        </h1>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

interface StatusSelectProps {
  on: boolean;
  onChange: (on: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}

/** Published or draft (or any other on/off state of a record). */
export function StatusSelect({
  on,
  onChange,
  onLabel = "Objavljeno",
  offLabel = "Draft",
}: StatusSelectProps) {
  return (
    <Select
      value={on ? "on" : "off"}
      onValueChange={(value) => onChange(value === "on")}
    >
      <SelectTrigger aria-label="Status" className="h-9 w-auto gap-2">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            on ? "bg-green-500" : "bg-muted-foreground/40",
          )}
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="on">{onLabel}</SelectItem>
        <SelectItem value="off">{offLabel}</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface FormCardProps {
  title?: string;
  className?: string;
  children: ReactNode;
}

export function FormCard({ title, className, children }: FormCardProps) {
  return (
    <Card className={cn("gap-4 p-5", className)}>
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
      {children}
    </Card>
  );
}

interface DeleteActionProps {
  /** The button, e.g. "Obriši materijal". */
  label: string;
  /** The question in the confirmation, e.g. "Obrisati materijal?". */
  title: string;
  /** What exactly is lost. */
  description: string;
  deleting: boolean;
  onConfirm: () => void;
}

/** Delete with a confirmation. Goes at the bottom of the page. */
export function DeleteAction({
  label,
  title,
  description,
  deleting,
  onConfirm,
}: DeleteActionProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={deleting}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          {deleting ? "Brisanje..." : label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Otkaži</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Brisanje..." : "Obriši"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
