"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import type { ThemeMode } from "@waslaeuftin/lib/theme";
import { Button } from "@waslaeuftin/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@waslaeuftin/components/ui/dropdown-menu";
import { applyTheme } from "@waslaeuftin/lib/theme";

export function SystemThemeListener() {
  useEffect(() => {
    applyTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(document.documentElement.dataset.themeMode);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return null;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored =
      typeof document === "undefined"
        ? "system"
        : document.documentElement.dataset.themeMode;
    return stored === "light" || stored === "dark" ? stored : "system";
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Farbschema wählen">
          <Monitor aria-hidden="true" className="theme-icon-system" />
          <Sun aria-hidden="true" className="theme-icon-light" />
          <Moon aria-hidden="true" className="theme-icon-dark" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Farbschema</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => {
            const preference = applyTheme(value);
            setMode(preference);
            try {
              localStorage.setItem("theme-mode", preference);
            } catch {
              // Keep the selection for this visit if storage is unavailable.
            }
          }}
        >
          <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">Hell</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dunkel</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
