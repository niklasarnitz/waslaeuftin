"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-renders the server component periodically so progress bars move without
// a manual reload. Polls quickly while a run is active.
export const AutoRefresh = ({ active }: { active: boolean }) => {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(
      () => {
        if (document.visibilityState === "visible") router.refresh();
      },
      active ? 3_000 : 30_000,
    );
    return () => clearInterval(interval);
  }, [active, router]);

  return null;
};
