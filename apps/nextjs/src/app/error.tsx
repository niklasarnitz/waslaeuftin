"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="bg-destructive/10 text-destructive mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
        Etwas ist schiefgelaufen
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm sm:text-base">
        Beim Laden der Kinodaten ist ein unerwarteter Fehler aufgetreten. Bitte
        versuche es erneut.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <Home className="h-4 w-4" />
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
