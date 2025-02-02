"use client";

import { useQueryState } from "nuqs";
import React from "react";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export const SearchTextField = () => {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useQueryState("searchQuery", {
    clearOnDefault: true,
    defaultValue: "",
  });

  return (
    <div className="flex w-full flex-1 flex-row items-center gap-x-2">
      <Search className="h-4 w-4" />
      <Input
        value={searchQuery ?? undefined}
        onChange={async (event) => {
          await setSearchQuery(event.target.value);
          router.push("");
        }}
        placeholder="Stadt suchen"
        className="flex-1"
      />
    </div>
  );
};
