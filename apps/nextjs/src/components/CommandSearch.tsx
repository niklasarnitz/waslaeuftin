"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Building2, Film, Loader2, MapPin, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@waslaeuftin/components/ui/dialog";
import { Input } from "@waslaeuftin/components/ui/input";
import { encodeUmlauts } from "@waslaeuftin/helpers/umlautsFixer";
import { api } from "@waslaeuftin/trpc/react";

type SearchItem = {
  id: string;
  href: string;
  type: "city" | "cinema" | "movie";
  name: string;
  subtitle?: string;
};

export function CommandSearch({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const router = useRouter();
  const showResults = !inline || query.trim().length > 0;
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();

  useEffect(() => {
    if (!open || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!cancelled) {
          setLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        }
      },
      () => {
        if (!cancelled) setLocation(undefined);
      },
      { maximumAge: 5 * 60 * 1000, timeout: 12000 },
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  const { data, isFetching, isError } = api.cities.search.useQuery(
    { query, location: query.trim() ? undefined : location },
    { enabled: open || (inline && showResults) },
  );
  const hasNearbyResults = !query.trim() && !!location && !!data;

  const items = useMemo<SearchItem[]>(() => {
    if (!data) return [];
    const result: SearchItem[] = [];
    for (const city of data.cities) {
      result.push({
        id: `city-${city.id}`,
        href: `/city/${encodeUmlauts(city.slug)}`,
        type: "city",
        name: city.name,
      });
    }
    for (const cinema of data.cinemas) {
      result.push({
        id: `cinema-${cinema.id}`,
        href: `/cinema/${encodeUmlauts(cinema.slug)}`,
        type: "cinema",
        name: cinema.name,
        subtitle: cinema.city.name,
      });
    }
    for (const movie of inline ? [] : (data.movies ?? [])) {
      result.push({
        id: `movie-${movie.id}`,
        href: `/?searchQuery=${encodeURIComponent(movie.name)}`,
        type: "movie",
        name: movie.name,
        subtitle: "Film",
      });
    }
    return result;
  }, [data, inline]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      const destination = new URL(href, window.location.origin);
      const date = new URLSearchParams(window.location.search).get("date");
      if (
        date &&
        (destination.pathname.startsWith("/city/") ||
          destination.pathname.startsWith("/cinema/"))
      ) {
        destination.searchParams.set("date", date);
      }
      router.push(destination.pathname + destination.search);
    },
    [router],
  );

  useEffect(() => {
    if (inline) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [inline]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showResults || items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev < items.length - 1 ? prev + 1 : 0;
          document
            .getElementById(`${searchId}-item-${next}`)
            ?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev > 0 ? prev - 1 : items.length - 1;
          document
            .getElementById(`${searchId}-item-${next}`)
            ?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[activeIndex];
        if (item) navigate(item.href);
      }
    },
    [items, activeIndex, navigate, searchId, showResults],
  );

  // Group items for rendering with section headers
  const cityItems = items.filter((i) => i.type === "city");
  const cinemaItems = items.filter((i) => i.type === "cinema");
  const movieItems = items.filter((i) => i.type === "movie");

  const searchContent = (
    <>
      <div className="focus-within:ring-ring relative flex items-center rounded-lg px-3 focus-within:ring-2 focus-within:ring-inset">
        <Search
          aria-hidden="true"
          className="text-muted-foreground mr-2 h-4 w-4 shrink-0"
        />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            inline ? "Stadt oder Kino suchen…" : "Stadt, Kino oder Film suchen…"
          }
          aria-label={
            inline ? "Stadt oder Kino suchen" : "Stadt, Kino oder Film suchen"
          }
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={showResults ? `${searchId}-results` : undefined}
          aria-activedescendant={
            showResults && items.length > 0 && activeIndex >= 0
              ? `${searchId}-item-${activeIndex}`
              : undefined
          }
          className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          autoFocus={!inline}
        />
      </div>

      {showResults && (
        <div
          ref={listRef}
          id={`${searchId}-results`}
          role="listbox"
          aria-label="Suchergebnisse"
          className="max-h-72 overflow-y-auto border-t"
        >
          {isFetching && (
            <div className="flex items-center justify-center py-6">
              <Loader2
                aria-hidden="true"
                className="text-muted-foreground h-5 w-5 animate-spin"
              />
            </div>
          )}

          {isError && !isFetching && (
            <p
              className="text-muted-foreground px-3 py-4 text-sm"
              role="status"
            >
              Die Suche konnte nicht geladen werden. Bitte versuche es erneut.
            </p>
          )}

          {items.length === 0 && !isFetching && !isError && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {query.length > 0
                ? "Keine Ergebnisse gefunden."
                : "Keine Städte oder Kinos verfügbar."}
            </p>
          )}

          {movieItems.length > 0 && (
            <div className="px-1 py-2">
              <p className="text-muted-foreground px-3 pb-1.5 text-xs font-medium">
                Filme
              </p>
              {movieItems.map((item, index) => {
                const flatIndex = index;
                return (
                  <button
                    key={item.id}
                    id={`${searchId}-item-${flatIndex}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={flatIndex === activeIndex}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    onFocus={() => setActiveIndex(flatIndex)}
                    data-active={flatIndex === activeIndex}
                    className="data-[active=true]:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                  >
                    <Film
                      aria-hidden="true"
                      className="text-muted-foreground h-4 w-4"
                    />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {cityItems.length > 0 && (
            <div className="px-1 py-2">
              <p className="text-muted-foreground px-3 pb-1.5 text-xs font-medium">
                {hasNearbyResults ? "Städte in der Nähe" : "Städte"}
              </p>
              {cityItems.map((item, index) => {
                const flatIndex = movieItems.length + index;
                return (
                  <button
                    key={item.id}
                    id={`${searchId}-item-${flatIndex}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={flatIndex === activeIndex}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    onFocus={() => setActiveIndex(flatIndex)}
                    data-active={flatIndex === activeIndex}
                    className="data-[active=true]:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                  >
                    <MapPin
                      aria-hidden="true"
                      className="text-muted-foreground h-4 w-4"
                    />
                    {item.name}
                  </button>
                );
              })}
            </div>
          )}

          {cinemaItems.length > 0 && (
            <div className="px-1 py-2">
              <p className="text-muted-foreground px-3 pb-1.5 text-xs font-medium">
                {hasNearbyResults ? "Kinos in der Nähe" : "Kinos"}
              </p>
              {cinemaItems.map((item, index) => {
                const flatIndex = movieItems.length + cityItems.length + index;
                return (
                  <button
                    key={item.id}
                    id={`${searchId}-item-${flatIndex}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={flatIndex === activeIndex}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    onFocus={() => setActiveIndex(flatIndex)}
                    data-active={flatIndex === activeIndex}
                    className="data-[active=true]:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                  >
                    <Building2
                      aria-hidden="true"
                      className="text-muted-foreground h-4 w-4"
                    />
                    <span>{item.name}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {item.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="border-input bg-background w-full max-w-xl overflow-hidden rounded-xl border shadow-sm">
        {searchContent}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Suche öffnen"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="border-input bg-background/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-10 w-10 items-center justify-center gap-2 rounded-lg border text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none sm:h-9 sm:w-full sm:max-w-64 sm:px-3"
      >
        <Search aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="hidden flex-1 text-left sm:inline">Suchen…</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none hidden h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            setQuery("");
            setActiveIndex(0);
          }
        }}
      >
        <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg [&>button:last-child]:hidden">
          <DialogTitle className="sr-only">Suche</DialogTitle>
          {searchContent}
        </DialogContent>
      </Dialog>
    </>
  );
}
