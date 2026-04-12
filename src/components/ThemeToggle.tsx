"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const switchTheme = () =>
    setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const handleClick = () => {
    if (!document.startViewTransition) switchTheme();
    else document.startViewTransition(switchTheme);
  };

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Theme Toggle"
      onClick={handleClick}
      title={resolvedTheme === "dark" ? "Svetla tema" : "Tamna tema"}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
