"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import {
  AVAILABLE_FIELDS,
  FIELDS_BY_CATEGORY,
  CATEGORY_LABELS,
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  ACTION_LABELS,
  APPLY_TO_LABELS,
  FORMULA_FIELDS,
  type RuleCondition,
  type RuleAction,
  type Operator,
  type ActionType,
  type ApplyTo,
  type FieldDefinition,
} from "@/lib/rules/types";
import type { RuleRow } from "./columns";

interface RuleFormClientProps {
  mode: "create" | "edit";
  initialRule?: RuleRow;
}

function generateId() {
  return crypto.randomUUID();
}

export function RuleFormClient({ mode, initialRule }: RuleFormClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState(initialRule?.name ?? "");
  const [description, setDescription] = useState(
    initialRule?.description ?? "",
  );
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  const [priority, setPriority] = useState(initialRule?.priority ?? 100);
  const [conditions, setConditions] = useState<RuleCondition[]>(
    (initialRule?.conditions as RuleCondition[]) ?? [],
  );
  const [actions, setActions] = useState<RuleAction[]>(
    (initialRule?.actions as RuleAction[]) ?? [],
  );

  // Clear a specific error when field changes
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Validate form before submit
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Naziv je obavezan";
    }

    if (actions.length === 0) {
      newErrors.actions = "Najmanje jedna akcija je obavezna";
    }

    // Validate add_item actions have required fields
    actions.forEach((action, i) => {
      if (action.type === "add_item") {
        if (!action.config.itemName?.trim()) {
          newErrors[`action_${action.id}_itemName`] =
            "Naziv stavke je obavezan";
        }
        if ((action.config.itemPrice ?? 0) < 0) {
          newErrors[`action_${action.id}_itemPrice`] =
            "Cena ne može biti negativna";
        }
      }
      if (
        (action.type === "discount_percentage" ||
          action.type === "surcharge_percentage" ||
          action.type === "discount_fixed" ||
          action.type === "surcharge_fixed") &&
        (action.config.value ?? 0) <= 0
      ) {
        newErrors[`action_${action.id}_value`] = "Vrednost mora biti veća od 0";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Track changes for edit mode
  const hasChanges = useMemo(() => {
    if (mode === "create") return true;
    if (!initialRule) return true;

    return (
      name !== initialRule.name ||
      description !== (initialRule.description ?? "") ||
      enabled !== initialRule.enabled ||
      priority !== initialRule.priority ||
      JSON.stringify(conditions) !== JSON.stringify(initialRule.conditions) ||
      JSON.stringify(actions) !== JSON.stringify(initialRule.actions)
    );
  }, [
    mode,
    initialRule,
    name,
    description,
    enabled,
    priority,
    conditions,
    actions,
  ]);

  // Condition helpers
  function addCondition() {
    setConditions([
      ...conditions,
      {
        id: generateId(),
        field: "wardrobe.height",
        operator: "greater_than",
        value: 0,
        logicOperator: "AND",
      },
    ]);
  }

  function updateCondition(id: string, updates: Partial<RuleCondition>) {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  }

  function removeCondition(id: string) {
    setConditions(conditions.filter((c) => c.id !== id));
  }

  // Action helpers
  function addAction(type: ActionType) {
    const newAction: RuleAction = {
      id: generateId(),
      type,
      config: {},
    };

    if (type === "add_item") {
      newAction.config = {
        itemName: "",
        itemPrice: 0,
        quantity: 1,
        visibleToCustomer: false,
      };
    } else if (
      type === "discount_percentage" ||
      type === "surcharge_percentage"
    ) {
      newAction.config = {
        value: 0,
        applyTo: "total",
      };
    } else {
      newAction.config = {
        value: 0,
      };
    }

    setActions([...actions, newAction]);
  }

  function updateAction(id: string, updates: Partial<RuleAction>) {
    setActions(
      actions.map((a) =>
        a.id === id
          ? { ...a, ...updates, config: { ...a.config, ...updates.config } }
          : a,
      ),
    );
  }

  function updateActionConfig(
    id: string,
    configUpdates: Record<string, unknown>,
  ) {
    setActions(
      actions.map((a) =>
        a.id === id ? { ...a, config: { ...a.config, ...configUpdates } } : a,
      ),
    );
  }

  function removeAction(id: string) {
    setActions(actions.filter((a) => a.id !== id));
  }

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url =
        mode === "create"
          ? "/api/admin/rules"
          : `/api/admin/rules/${initialRule?.id}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          enabled,
          priority,
          conditions,
          actions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Greška pri čuvanju pravila");
        return;
      }

      toast.success(
        mode === "create" ? "Pravilo kreirano" : "Pravilo sačuvano",
      );
      router.push("/admin/rules");
      router.refresh();
    } catch (error) {
      console.error("Failed to save rule:", error);
      toast.error("Greška pri čuvanju pravila");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Delete handler
  async function handleDelete() {
    if (!initialRule) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/rules/${initialRule.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error("Greška pri brisanju pravila");
        return;
      }

      toast.success("Pravilo obrisano");
      router.push("/admin/rules");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete rule:", error);
      toast.error("Greška pri brisanju pravila");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/rules">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {mode === "create" ? "Novo pravilo" : "Uredi pravilo"}
            </h1>
            {initialRule && (
              <div
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  enabled
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {enabled ? "Aktivno" : "Neaktivno"}
              </div>
            )}
          </div>
        </div>
        {mode === "edit" && initialRule && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Obriši
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                <AlertDialogDescription>
                  Obrisaćete pravilo &quot;{initialRule.name}&quot;. Ova akcija
                  se ne može poništiti.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Otkaži</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Obriši
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Osnovne informacije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Naziv *</Label>
                <div className="relative pb-5">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearError("name");
                    }}
                    placeholder="npr. Dodaj šarke za vrata"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="absolute bottom-0 left-0 text-xs text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioritet</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Manji broj = veći prioritet (izvršava se prvo)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opišite šta ovo pravilo radi..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor="enabled">Aktivno</Label>
            </div>
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Uslovi</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCondition}
            >
              Dodaj uslov
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nema uslova - pravilo će se primenjivati na sve porudžbine
              </p>
            ) : (
              conditions.map((condition, index) => (
                <ConditionRow
                  key={condition.id}
                  condition={condition}
                  isLast={index === conditions.length - 1}
                  onUpdate={(updates) => updateCondition(condition.id, updates)}
                  onRemove={() => removeCondition(condition.id)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Akcije *</CardTitle>
              {errors.actions && (
                <p className="text-xs text-destructive mt-1">
                  {errors.actions}
                </p>
              )}
            </div>
            <Select
              onValueChange={(value) => {
                addAction(value as ActionType);
                clearError("actions");
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Dodaj akciju" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-4">
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Dodajte najmanje jednu akciju
              </p>
            ) : (
              actions.map((action) => (
                <ActionRow
                  key={action.id}
                  action={action}
                  errors={errors}
                  onUpdateConfig={(updates) =>
                    updateActionConfig(action.id, updates)
                  }
                  onClearError={clearError}
                  onRemove={() => removeAction(action.id)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Submit buttons */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/rules">Otkaži</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || !hasChanges}>
            {isSubmitting
              ? "Čuvanje..."
              : mode === "create"
                ? "Kreiraj pravilo"
                : "Sačuvaj izmene"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// CONDITION ROW COMPONENT
// ============================================================================

interface ConditionRowProps {
  condition: RuleCondition;
  isLast: boolean;
  onUpdate: (updates: Partial<RuleCondition>) => void;
  onRemove: () => void;
}

function ConditionRow({
  condition,
  isLast,
  onUpdate,
  onRemove,
}: ConditionRowProps) {
  const selectedField = AVAILABLE_FIELDS.find((f) => f.key === condition.field);
  const availableOperators = selectedField
    ? OPERATORS_BY_TYPE[selectedField.type] || []
    : [];

  return (
    <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
      <div className="flex-1 grid gap-2 md:grid-cols-4">
        {/* Field selector */}
        <Select
          value={condition.field}
          onValueChange={(value) => {
            const newField = AVAILABLE_FIELDS.find((f) => f.key === value);
            const newOperators = newField
              ? OPERATORS_BY_TYPE[newField.type] || []
              : [];
            onUpdate({
              field: value,
              // Reset operator if current one is not valid for new field type
              operator: newOperators.includes(condition.operator as Operator)
                ? condition.operator
                : (newOperators[0] as Operator),
              value: newField?.type === "boolean" ? true : "",
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FIELDS_BY_CATEGORY).map(([category, fields]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </div>
                {fields.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>

        {/* Operator selector */}
        <Select
          value={condition.operator}
          onValueChange={(value) => onUpdate({ operator: value as Operator })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableOperators.map((op) => (
              <SelectItem key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value input */}
        {condition.operator !== "is_empty" &&
          condition.operator !== "is_not_empty" && (
            <ConditionValueInput
              field={selectedField}
              value={condition.value}
              onChange={(value) =>
                onUpdate({ value: value as RuleCondition["value"] })
              }
            />
          )}

        {/* Logic operator (AND/OR) - only show if not last */}
        {!isLast && (
          <Select
            value={condition.logicOperator || "AND"}
            onValueChange={(value) =>
              onUpdate({ logicOperator: value as "AND" | "OR" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">I (AND)</SelectItem>
              <SelectItem value="OR">ILI (OR)</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// CONDITION VALUE INPUT
// ============================================================================

interface ConditionValueInputProps {
  field: FieldDefinition | undefined;
  value: unknown;
  onChange: (value: unknown) => void;
}

function ConditionValueInput({
  field,
  value,
  onChange,
}: ConditionValueInputProps) {
  if (!field) {
    return (
      <Input
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Vrednost"
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <Select
        value={String(value)}
        onValueChange={(v) => onChange(v === "true")}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Da</SelectItem>
          <SelectItem value="false">Ne</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder="Vrednost"
        />
        {field.unit && (
          <span className="text-sm text-muted-foreground">{field.unit}</span>
        )}
      </div>
    );
  }

  // String or array
  return (
    <Input
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Vrednost"
    />
  );
}

// ============================================================================
// ACTION ROW COMPONENT
// ============================================================================

interface ActionRowProps {
  action: RuleAction;
  errors: Record<string, string>;
  onUpdateConfig: (updates: Record<string, unknown>) => void;
  onClearError: (field: string) => void;
  onRemove: () => void;
}

function ActionRow({
  action,
  errors,
  onUpdateConfig,
  onClearError,
  onRemove,
}: ActionRowProps) {
  const { type, config } = action;

  const itemNameError = errors[`action_${action.id}_itemName`];
  const itemPriceError = errors[`action_${action.id}_itemPrice`];
  const valueError = errors[`action_${action.id}_value`];

  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{ACTION_LABELS[type as ActionType]}</Badge>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {type === "add_item" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Naziv stavke *</Label>
            <div className="relative pb-5">
              <Input
                value={config.itemName ?? ""}
                onChange={(e) => {
                  onUpdateConfig({ itemName: e.target.value });
                  onClearError(`action_${action.id}_itemName`);
                }}
                placeholder="npr. Šarke tip A"
                aria-invalid={!!itemNameError}
              />
              {itemNameError && (
                <p className="absolute bottom-0 left-0 text-xs text-destructive">
                  {itemNameError}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>SKU (opciono)</Label>
            <div className="relative pb-5">
              <Input
                value={config.itemSku ?? ""}
                onChange={(e) => onUpdateConfig({ itemSku: e.target.value })}
                placeholder="npr. SARKE-001"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cena po komadu (RSD)</Label>
            <div className="relative pb-5">
              <Input
                type="number"
                value={config.itemPrice ?? 0}
                onChange={(e) => {
                  onUpdateConfig({ itemPrice: Number(e.target.value) });
                  onClearError(`action_${action.id}_itemPrice`);
                }}
                min={0}
                aria-invalid={!!itemPriceError}
              />
              {itemPriceError && (
                <p className="absolute bottom-0 left-0 text-xs text-destructive">
                  {itemPriceError}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Količina</Label>
            <div className="relative pb-5">
              <Input
                value={config.quantity ?? 1}
                onChange={(e) => {
                  const val = e.target.value;
                  // Try to parse as number, otherwise keep as string (formula)
                  const num = Number(val);
                  onUpdateConfig({ quantity: isNaN(num) ? val : num });
                }}
                placeholder="1 ili doorCount * 3"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Fiksni broj ili formula sa promenljivom:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {FORMULA_FIELDS.map((f) => (
                  <code
                    key={f.key}
                    className="px-1.5 py-0.5 bg-muted rounded text-[10px]"
                  >
                    {f.key}
                  </code>
                ))}
              </div>
              <p className="mt-1.5">
                Primer:{" "}
                <code className="px-1 py-0.5 bg-muted rounded">
                  doorCount * 3
                </code>{" "}
                = 3 komada po vratima
              </p>
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Switch
              id={`visible-${action.id}`}
              checked={config.visibleToCustomer ?? false}
              onCheckedChange={(checked) =>
                onUpdateConfig({ visibleToCustomer: checked })
              }
            />
            <Label htmlFor={`visible-${action.id}`}>Vidljivo kupcu</Label>
          </div>
        </div>
      )}

      {(type === "discount_percentage" || type === "surcharge_percentage") && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Procenat (%) *</Label>
            <div className="relative pb-5">
              <Input
                type="number"
                value={config.value ?? 0}
                onChange={(e) => {
                  onUpdateConfig({ value: Number(e.target.value) });
                  onClearError(`action_${action.id}_value`);
                }}
                min={0}
                max={100}
                aria-invalid={!!valueError}
              />
              {valueError && (
                <p className="absolute bottom-0 left-0 text-xs text-destructive">
                  {valueError}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Primeni na</Label>
            <Select
              value={config.applyTo ?? "total"}
              onValueChange={(value) => onUpdateConfig({ applyTo: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPLY_TO_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Razlog (opciono)</Label>
            <Input
              value={config.reason ?? ""}
              onChange={(e) => onUpdateConfig({ reason: e.target.value })}
              placeholder="npr. Popust za veleprodaju"
            />
          </div>
        </div>
      )}

      {(type === "discount_fixed" || type === "surcharge_fixed") && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Iznos (RSD) *</Label>
            <div className="relative pb-5">
              <Input
                type="number"
                value={config.value ?? 0}
                onChange={(e) => {
                  onUpdateConfig({ value: Number(e.target.value) });
                  onClearError(`action_${action.id}_value`);
                }}
                min={0}
                aria-invalid={!!valueError}
              />
              {valueError && (
                <p className="absolute bottom-0 left-0 text-xs text-destructive">
                  {valueError}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Razlog (opciono)</Label>
            <div className="relative pb-5">
              <Input
                value={config.reason ?? ""}
                onChange={(e) => onUpdateConfig({ reason: e.target.value })}
                placeholder="npr. Montaža visokog ormana"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
