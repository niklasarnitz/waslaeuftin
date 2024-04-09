"use client";

import { Button } from "@waslaeuftin/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import nightwind from "nightwind/helper";
import { useEffect, useState } from "react";

export const ColorThemeToggleButton = () => {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  const toggleMode = () => {
    nightwind.beforeTransition();
    if (theme !== "dark") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div>
      {isMounted ? (
        <Button onClick={toggleMode} suppressHydrationWarning size="icon">
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      ) : null}
    </div>
  );
};
