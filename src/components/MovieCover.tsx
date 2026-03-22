"use client";

import { Film } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@waslaeuftin/lib/utils";

type MovieCoverProps = {
  title: string;
  coverUrl?: string | null;
  className?: string;
};

const MovieCoverFallback = ({ title }: { title: string }) => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-gradient-to-br from-background via-muted/50 to-accent/60">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,hsl(var(--primary)/0.2),transparent_45%),radial-gradient(circle_at_84%_82%,hsl(var(--accent-foreground)/0.14),transparent_52%)]" />
      <div className="relative z-10 flex items-center gap-2 text-muted-foreground">
        <Film className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">
          Kein Cover
        </span>
      </div>
    </div>
  );
};

export const MovieCover = ({ title, coverUrl, className }: MovieCoverProps) => {
  const [hasImageError, setHasImageError] = useState(false);

  if (!coverUrl || hasImageError) {
    return (
      <div className={cn("relative aspect-[2/3] overflow-hidden rounded-lg", className)}>
        <MovieCoverFallback title={title} />
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-lg", className)}>
      <Image
        src={coverUrl}
        alt={`Filmcover von ${title}`}
        fill
        sizes="(max-width: 768px) 30vw, 140px"
        className="object-cover"
        onError={() => setHasImageError(true)}
      />
    </div>
  );
};
