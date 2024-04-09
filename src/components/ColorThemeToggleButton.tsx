"use client";

import { Button } from "@waslaeuftin/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import nightwind from "nightwind/helper";

export const ColorThemeToggleButton = () => {
  const { theme, setTheme } = useTheme();

  const toggleMode = () => {
    nightwind.beforeTransition();
    if (theme !== "dark") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <Button onClick={toggleMode} suppressHydrationWarning size="icon">
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
};
