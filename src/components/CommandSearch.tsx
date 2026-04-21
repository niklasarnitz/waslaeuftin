"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@waslaeuftin/components/ui/dialog";
import { Input } from "@waslaeuftin/components/ui/input";
import { api } from "@waslaeuftin/trpc/react";
import { Building2, Loader2, MapPin, Search } from "lucide-react";
import { encodeUmlauts } from "@waslaeuftin/helpers/umlautsFixer";

type SearchItem = {
  id: string;
  href: string;
  type: "city" | "cinema";
  name: string;
  subtitle?: string;
};

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data, isFetching } = api.cities.search.useQuery(query, {
    enabled: open,
    placeholderData: (prev) => prev,
  });

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
    return result;
  }, [data]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev < items.length - 1 ? prev + 1 : 0;
          document
            .getElementById(`cmd-item-${next}`)
            ?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev > 0 ? prev - 1 : items.length - 1;
          document
            .getElementById(`cmd-item-${next}`)
            ?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[activeIndex];
        if (item) navigate(item.href);
      }
    },
    [items, activeIndex, navigate],
  );

  // Group items for rendering with section headers
  const cityItems = items.filter((i) => i.type === "city");
  const cinemaItems = items.filter((i) => i.type === "cinema");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-input bg-background/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-9 w-full max-w-64 items-center gap-2 rounded-lg border px-3 text-sm shadow-sm transition-colors"
      >
        <Search aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Suchen…</span>
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
          <div className="flex items-center border-b px-3">
            <Search
              aria-hidden="true"
              className="text-muted-foreground mr-2 h-4 w-4 shrink-0"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Stadt oder Kino suchen…"
              aria-label="Stadt oder Kino suchen"
              className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto">
            {isFetching && (
              <div className="flex items-center justify-center py-6">
                <Loader2
                  aria-hidden="true"
                  className="text-muted-foreground h-5 w-5 animate-spin"
                />
              </div>
            )}

            {items.length === 0 && !isFetching && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                {query.length > 0
                  ? "Keine Ergebnisse gefunden."
                  : "Keine Städte oder Kinos verfügbar."}
              </p>
            )}

            {cityItems.length > 0 && (
              <div className="px-1 py-2">
                <p className="text-muted-foreground px-3 pb-1.5 text-xs font-medium">
                  {query.length > 0 ? "Städte" : "Städte in der Nähe"}
                </p>
                {cityItems.map((item) => {
                  const flatIndex = items.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      id={`cmd-item-${flatIndex}`}
                      type="button"
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      data-active={flatIndex === activeIndex}
                      className="data-[active=true]:bg-accent flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm"
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
                  {query.length > 0 ? "Kinos" : "Kinos in der Nähe"}
                </p>
                {cinemaItems.map((item) => {
                  const flatIndex = items.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      id={`cmd-item-${flatIndex}`}
                      type="button"
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      data-active={flatIndex === activeIndex}
                      className="data-[active=true]:bg-accent flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm"
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
        </DialogContent>
      </Dialog>
    </>
  );
}
