import Link from "next/link";
import { Film, Home, MapPin, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="bg-primary/10 text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Film className="h-8 w-8" />
      </div>

      <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
        Seite nicht gefunden
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm sm:text-base">
        Die gesuchte Seite oder das angefragte Kino existiert leider nicht oder
        wurde verschoben.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
        >
          <Home className="h-4 w-4" />
          Zur Startseite
        </Link>
        <Link
          href="/city/berlin"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Städte durchsuchen
        </Link>
      </div>
    </div>
  );
}
