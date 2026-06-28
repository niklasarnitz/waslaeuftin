"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { useQueryState } from "nuqs";

import { Input } from "@waslaeuftin/components/ui/input";

export const SearchTextField = () => {
  const [searchQuery, setSearchQuery] = useQueryState("searchQuery", {
    clearOnDefault: true,
    defaultValue: "",
  });
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="group relative flex w-full flex-1 flex-row items-center">
      <Search
        aria-hidden="true"
        className="text-sidebar-foreground/60 group-focus-within:text-primary pointer-events-none absolute left-3 h-4 w-4 transition-colors"
      />
      <Input
        ref={inputRef}
        value={searchQuery ?? undefined}
        onChange={(event) => {
          void setSearchQuery(event.target.value);
        }}
        placeholder="Stadt oder Kino suchen"
        className="border-sidebar-border bg-sidebar h-10 flex-1 rounded-xl px-9 text-sm shadow-none focus-visible:ring-2"
        aria-label="Stadt oder Kino suchen"
      />
      {Boolean(searchQuery) && (
        <button
          type="button"
          onClick={() => {
            void setSearchQuery("");
            inputRef.current?.focus();
          }}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground focus-visible:ring-ring absolute right-3 inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
          aria-label="Suche zurücksetzen"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
