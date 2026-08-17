"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";

export function IosAppBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user is on iOS device (iPhone/iPad/iPod)
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    // Check if standalone mode (already installed as PWA or native app wrapper)
    const isStandalone =
      ("standalone" in window.navigator &&
        (window.navigator as unknown as { standalone?: boolean }).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Check if dismissed before
    const isDismissed =
      localStorage.getItem("waslaeuftin_ios_banner_dismissed") === "true";

    if (isIos && !isStandalone && !isDismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("waslaeuftin_ios_banner_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="bg-primary/95 text-primary-foreground border-primary/20 sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 shadow-md backdrop-blur transition-all">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={handleDismiss}
          className="text-primary-foreground/80 hover:text-primary-foreground rounded-md p-1 transition-colors"
          aria-label="Banner schließen"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white">
            WLI
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs leading-tight font-bold">
              WasLäuftIn iOS App
            </p>
            <p className="truncate text-[10px] opacity-90">
              Kino-Erinnerungen & Mobile App nutzen
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/download"
          className="text-primary flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-sm transition-colors hover:bg-white/90"
        >
          <span>App holen</span>
          <Download className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
