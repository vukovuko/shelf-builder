"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  ACCESSORY_RULE_CATEGORY_LABELS,
  ACCESSORY_RULE_FIELDS,
  ACCESSORY_RULE_FIELDS_BY_CATEGORY,
  ACCESSORY_RULE_MATERIAL_LABELS,
  ACCESSORY_RULE_TARGET_LABELS,
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  type FieldDefinition,
  type Operator,
  type RuleCondition,
  type SerializedAccessoryRule,
} from "@/lib/accessory-rules";

interface AccessoryRuleFormClientProps {
  mode: "create" | "edit";
  initialRule?: SerializedAccessoryRule;
}

function generateId() {
  return crypto.randomUUID();
}

const FORMULA_EXAMPLES = [
  "target.width",
  "target.height",
  "target.depth",
  "target.outerWidth",
  "target.outerHeight",
  "wardrobe.width",
  "wardrobe.height",
  "wardrobe.depth",
  "wardrobe.shelfCount",
  "wardrobe.doorCount",
  "wardrobe.drawerCount",
  "material.selectedThickness",
  "material.korpusThickness",
  "material.frontThickness",
  "material.backThickness",
];

export function AccessoryRuleFormClient({
  mode,
  initialRule,
}: AccessoryRuleFormClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initialRule?.name ?? "");
  const [description, setDescription] = useState(initialRule?.description ?? "");
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  const [priority, setPriority] = useState(initialRule?.priority ?? 100);
  const [target, setTarget] = useState(initialRule?.target ?? "elements");
  const [conditions, setConditions] = useState<RuleCondition[]>(
    initialRule?.conditions ?? [],
  );
  const [itemName, setItemName] = useState(initialRule?.config.itemName ?? "");
  const [codePrefix, setCodePrefix] = useState(initialRule?.config.codePrefix ?? "");
  const [materialType, setMaterialType] = useState(
    initialRule?.config.materialType ?? "korpus",
  );
  const [widthFormula, setWidthFormula] = useState(
    initialRule?.config.widthFormula ?? "target.width",
  );
  const [heightFormula, setHeightFormula] = useState(
    initialRule?.config.heightFormula ?? "target.height",
  );
  const [thicknessFormula, setThicknessFormula] = useState(
    initialRule?.config.thicknessFormula ?? "",
  );
  const [quantity, setQuantity] = useState(
    initialRule?.config.quantity != null
      ? String(initialRule.config.quantity)
      : "1",
  );

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const { [field]: _ignored, ...rest } = prev;
        return rest;
      });
    }
  };

  const hasChanges = useMemo(() => {
    if (mode === "create") return true;
    if (!initialRule) return true;

    return (
      name !== initialRule.name ||
      description !== (initialRule.description ?? "") ||
      enabled !== initialRule.enabled ||
      priority !== initialRule.priority ||
      target !== initialRule.target ||
      JSON.stringify(conditions) !== JSON.stringify(initialRule.conditions) ||
      itemName !== initialRule.config.itemName ||
      codePrefix !== (initialRule.config.codePrefix ?? "") ||
      materialType !== (initialRule.config.materialType ?? "korpus") ||
      widthFormula !== initialRule.config.widthFormula ||
      heightFormula !== initialRule.config.heightFormula ||
      thicknessFormula !== (initialRule.config.thicknessFormula ?? "") ||
      quantity !== String(initialRule.config.quantity ?? "1")
    );
  }, [
    codePrefix,
    conditions,
    description,
    enabled,
    heightFormula,
    initialRule,
    itemName,
    materialType,
    mode,
    name,
    priority,
    quantity,
    target,
    thicknessFormula,
    widthFormula,
  ]);

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
    setConditions((current) =>
      current.map((condition) =>
        condition.id === id ? { ...condition, ...updates } : condition,
      ),
    );
  }

  function removeCondition(id: string) {
    setConditions((current) => current.filter((condition) => condition.id !== id));
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Naziv je obavezan";
    if (!itemName.trim()) nextErrors.itemName = "Naziv stavke je obavezan";
    if (!widthFormula.trim()) nextErrors.widthFormula = "Unesite formulu za širinu";
    if (!heightFormula.trim()) nextErrors.heightFormula = "Unesite formulu za visinu";
    if (!quantity.trim()) nextErrors.quantity = "Unesite količinu ili formulu";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const quantityValue = Number(quantity);
    const normalizedQuantity = Number.isFinite(quantityValue)
      ? quantityValue
      : quantity.trim();

    try {
      const url =
        mode === "create"
          ? "/api/admin/accessory-rules"
          : `/api/admin/accessory-rules/${initialRule?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          enabled,
          priority,
          target,
          conditions,
          config: {
            itemName: itemName.trim(),
            codePrefix: codePrefix.trim() || null,
            materialType,
            widthFormula: widthFormula.trim(),
            heightFormula: heightFormula.trim(),
            thicknessFormula: thicknessFormula.trim() || null,
            quantity: normalizedQuantity,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Greška pri čuvanju pravila");
        return;
      }

      toast.success(
        mode === "create"
          ? "Pravilo za dodatke kreirano"
          : "Pravilo za dodatke sačuvano",
      );
      router.push("/admin/accessory-rules");
      router.refresh();
    } catch (error) {
      console.error("Failed to save accessory rule:", error);
      toast.error("Greška pri čuvanju pravila");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialRule) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/accessory-rules/${initialRule.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        toast.error("Greška pri brisanju pravila");
        return;
      }

      toast.success("Pravilo obrisano");
      router.push("/admin/accessory-rules");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete accessory rule:", error);
      toast.error("Greška pri brisanju pravila");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/accessory-rules">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {mode === "create"
                ? "Novo pravilo za dodatke"
                : "Uredi pravilo za dodatke"}
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
                  Obrisaćete pravilo &quot;{initialRule.name}&quot;. Ova akcija se
                  ne može poništiti.
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
        <Card>
          <CardHeader>
            <CardTitle>Osnovne informacije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Naziv *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearError("name");
                  }}
                  placeholder="npr. Leđna ojačanja za vrata"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioritet</Label>
                <Input
                  id="priority"
                  type="number"
                  min={1}
                  value={priority}
                  onChange={(event) => setPriority(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Kada i zašto se generišu dodatne ploče"
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Target</Label>
                <Select
                  value={target}
                  onValueChange={(value) => setTarget(value as typeof target)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCESSORY_RULE_TARGET_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-8">
                <Switch checked={enabled} onCheckedChange={setEnabled} id="enabled" />
                <Label htmlFor="enabled">Aktivno</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Uslovi</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addCondition}>
              Dodaj uslov
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nema uslova. Pravilo se primenjuje na sve odgovarajuće targete.
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

        <Card>
          <CardHeader>
            <CardTitle>Generisana ploča</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itemName">Naziv stavke *</Label>
                <Input
                  id="itemName"
                  value={itemName}
                  onChange={(event) => {
                    setItemName(event.target.value);
                    clearError("itemName");
                  }}
                  placeholder="npr. Ojačanje vrata"
                />
                {errors.itemName && (
                  <p className="text-xs text-destructive">{errors.itemName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="codePrefix">Prefiks šifre</Label>
                <Input
                  id="codePrefix"
                  value={codePrefix}
                  onChange={(event) => setCodePrefix(event.target.value)}
                  placeholder="npr. OJAC"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Materijal</Label>
                <Select
                  value={materialType}
                  onValueChange={(value) =>
                    setMaterialType(value as typeof materialType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCESSORY_RULE_MATERIAL_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Količina po targetu</Label>
                <Input
                  id="quantity"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(event.target.value);
                    clearError("quantity");
                  }}
                  placeholder="1 ili target.width / 50"
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="widthFormula">Formula za širinu (cm) *</Label>
                <Input
                  id="widthFormula"
                  value={widthFormula}
                  onChange={(event) => {
                    setWidthFormula(event.target.value);
                    clearError("widthFormula");
                  }}
                  placeholder="target.width"
                />
                {errors.widthFormula && (
                  <p className="text-xs text-destructive">{errors.widthFormula}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="heightFormula">Formula za visinu (cm) *</Label>
                <Input
                  id="heightFormula"
                  value={heightFormula}
                  onChange={(event) => {
                    setHeightFormula(event.target.value);
                    clearError("heightFormula");
                  }}
                  placeholder="target.height"
                />
                {errors.heightFormula && (
                  <p className="text-xs text-destructive">{errors.heightFormula}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thicknessFormula">Formula za debljinu (mm)</Label>
              <Input
                id="thicknessFormula"
                value={thicknessFormula}
                onChange={(event) => setThicknessFormula(event.target.value)}
                placeholder="Prazno = podrazumevana debljina iz izabranog materijala"
              />
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <p className="font-medium">Dostupne formule</p>
              <p className="text-muted-foreground">
                Širina i visina su u centimetrima. Debljina je u milimetrima.
              </p>
              <div className="flex flex-wrap gap-2">
                {FORMULA_EXAMPLES.map((example) => (
                  <code
                    key={example}
                    className="rounded bg-background px-2 py-1 text-xs"
                  >
                    {example}
                  </code>
                ))}
              </div>
              <p className="text-muted-foreground">
                Podržane su operacije <strong>+</strong>, <strong>-</strong>,
                <strong> *</strong>, <strong>/</strong> i zagrade.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/accessory-rules">Otkaži</Link>
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

interface ConditionRowProps {
  condition: RuleCondition;
  isLast: boolean;
  onUpdate: (updates: Partial<RuleCondition>) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, isLast, onUpdate, onRemove }: ConditionRowProps) {
  const selectedField = ACCESSORY_RULE_FIELDS.find(
    (field) => field.key === condition.field,
  );
  const availableOperators = selectedField
    ? OPERATORS_BY_TYPE[selectedField.type] || []
    : [];

  return (
    <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
      <div className="flex-1 grid gap-2 md:grid-cols-4">
        <Select
          value={condition.field}
          onValueChange={(value) => {
            const newField = ACCESSORY_RULE_FIELDS.find((field) => field.key === value);
            const newOperators = newField
              ? OPERATORS_BY_TYPE[newField.type] || []
              : [];

            onUpdate({
              field: value,
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
            {Object.entries(ACCESSORY_RULE_FIELDS_BY_CATEGORY).map(
              ([category, fields]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {
                      ACCESSORY_RULE_CATEGORY_LABELS[
                        category as keyof typeof ACCESSORY_RULE_CATEGORY_LABELS
                      ]
                    }
                  </div>
                  {fields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </div>
              ),
            )}
          </SelectContent>
        </Select>

        <Select
          value={condition.operator}
          onValueChange={(value) => onUpdate({ operator: value as Operator })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableOperators.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {OPERATOR_LABELS[operator]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ConditionValueInputProps {
  field: FieldDefinition | undefined;
  value: unknown;
  onChange: (value: unknown) => void;
}

function ConditionValueInput({ field, value, onChange }: ConditionValueInputProps) {
  if (!field) {
    return (
      <Input
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Vrednost"
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <Select value={String(value)} onValueChange={(v) => onChange(v === "true")}>
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
          onChange={(event) => onChange(Number(event.target.value))}
          placeholder="Vrednost"
        />
        {field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
      </div>
    );
  }

  return (
    <Input
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Vrednost"
    />
  );
}