"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategoryCombobox({
  value,
  onChange,
  placeholder = "Izaberi kategoriju...",
  disabled = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/admin/materials/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  // Check if search value matches any existing category (case-insensitive)
  const searchLower = search.toLowerCase().trim();
  const matchesExisting = categories.some(
    (cat) => cat.toLowerCase() === searchLower,
  );

  // Filter categories based on search
  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(searchLower),
  );

  // Show "add new" option only if:
  // 1. There's a search value
  // 2. It doesn't match an existing category exactly
  const showAddNew = search.trim() && !matchesExisting;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Pretrazi ili unesi novu..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Ucitavanje...
              </div>
            ) : (
              <>
                {filteredCategories.length === 0 && !showAddNew && (
                  <CommandEmpty>Nema kategorija</CommandEmpty>
                )}

                {showAddNew && (
                  <CommandGroup>
                    <CommandItem
                      value={`__new__${search}`}
                      onSelect={() => {
                        onChange(search.trim());
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj &quot;{search.trim()}&quot;
                    </CommandItem>
                  </CommandGroup>
                )}

                {filteredCategories.length > 0 && (
                  <CommandGroup heading="Postojece kategorije">
                    {filteredCategories.map((category) => (
                      <CommandItem
                        key={category}
                        value={category}
                        onSelect={() => {
                          onChange(category);
                          setOpen(false);
                          setSearch("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === category ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {category}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
