"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";

export function IosAppBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user is on iOS device (iPhone/iPad/iPod)
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;

    // Check if standalone mode (already installed as PWA or native app wrapper)
    const isStandalone =
      ("standalone" in window.navigator && (window.navigator as unknown as { standalone?: boolean }).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Check if dismissed before
    const isDismissed = localStorage.getItem("waslaeuftin_ios_banner_dismissed") === "true";

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
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={handleDismiss}
          className="text-primary-foreground/80 hover:text-primary-foreground p-1 rounded-md transition-colors"
          aria-label="Banner schließen"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 font-bold text-white text-xs shrink-0">
            WLI
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight truncate">WasLäuftIn iOS App</p>
            <p className="text-[10px] opacity-90 truncate">Kino-Erinnerungen & Mobile App nutzen</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/download"
          className="bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-white/90 transition-colors flex items-center gap-1"
        >
          <span>App holen</span>
          <Download className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
