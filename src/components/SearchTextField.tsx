"use client";

import { useQueryState } from "nuqs";
import React from "react";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";

export const SearchTextField = () => {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useQueryState("searchQuery");

  return (
    <Input
      value={searchQuery ?? undefined}
      onChange={async (event) => {
        await setSearchQuery(event.target.value);
        router.push("");
      }}
      placeholder="Suche"
      className="w-1/2"
    />
  );
};
