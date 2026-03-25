"use client";

import { useQueryState } from "nuqs";
import React from "react";
import { Input } from "./ui/input";
import { Search, X } from "lucide-react";

export const SearchTextField = () => {
    const [searchQuery, setSearchQuery] = useQueryState("searchQuery", {
        clearOnDefault: true,
        defaultValue: "",
    });

    return (
        <div className="group relative flex w-full flex-1 flex-row items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-sidebar-foreground/60 transition-colors group-focus-within:text-primary" />
            <Input
                value={searchQuery ?? undefined}
                onChange={(event) => {
                    void setSearchQuery(event.target.value);
                }}
                placeholder="Stadt oder Kino suchen"
                className="h-10 flex-1 rounded-xl border-sidebar-border bg-sidebar px-9 text-sm shadow-none focus-visible:ring-2"
            />
            {Boolean(searchQuery) && (
                <button
                    type="button"
                    onClick={() => {
                        void setSearchQuery("");
                    }}
                    className="absolute right-3 inline-flex h-5 w-5 items-center justify-center rounded-full text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
                    aria-label="Suche zurücksetzen"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};
