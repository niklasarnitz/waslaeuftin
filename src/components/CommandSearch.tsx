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
import { Building2, MapPin, Search } from "lucide-react";
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
                    document.getElementById(`cmd-item-${next}`)?.scrollIntoView({ block: "nearest" });
                    return next;
                });
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((prev) => {
                    const next = prev > 0 ? prev - 1 : items.length - 1;
                    document.getElementById(`cmd-item-${next}`)?.scrollIntoView({ block: "nearest" });
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
                className="inline-flex h-9 w-full max-w-64 items-center gap-2 rounded-lg border border-input bg-background/60 px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
                <Search aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Suchen…</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
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
                        <Search aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
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
                        {items.length === 0 && !isFetching && (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {query.length > 0 ? "Keine Ergebnisse gefunden." : "Keine Städte oder Kinos verfügbar."}
                            </p>
                        )}

                        {cityItems.length > 0 && (
                            <div className="px-1 py-2">
                                <p className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">
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
                                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm data-[active=true]:bg-accent"
                                        >
                                            <MapPin aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                                            {item.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {cinemaItems.length > 0 && (
                            <div className="px-1 py-2">
                                <p className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">
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
                                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm data-[active=true]:bg-accent"
                                        >
                                            <Building2 aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                                            <span>{item.name}</span>
                                            <span className="ml-auto text-xs text-muted-foreground">
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
