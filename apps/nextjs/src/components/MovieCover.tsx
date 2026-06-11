"use client";

import { useState } from "react";
import Image from "next/image";
import { Film } from "lucide-react";

import { cn } from "@waslaeuftin/lib/utils";

type MovieCoverProps = {
  title: string;
  coverUrl?: string | null;
  className?: string;
  eager?: boolean;
};

const MovieCoverFallback = ({ title }: { title: string }) => {
  return (
    <div className="border-border/70 from-background via-muted/50 to-accent/60 relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-br">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,hsl(var(--primary)/0.2),transparent_45%),radial-gradient(circle_at_84%_82%,hsl(var(--accent-foreground)/0.14),transparent_52%)]" />
      <div className="text-muted-foreground relative z-10 flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
        <Film className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        <span className="text-[9px] font-semibold tracking-[0.14em] uppercase sm:text-xs">
          Kein Cover
        </span>
      </div>
    </div>
  );
};

export const MovieCover = ({
  title,
  coverUrl,
  className,
  eager = false,
}: MovieCoverProps) => {
  const [hasImageError, setHasImageError] = useState(false);

  if (!coverUrl || hasImageError) {
    return (
      <div
        className={cn(
          "relative aspect-[2/3] overflow-hidden rounded-lg",
          className,
        )}
      >
        <MovieCoverFallback title={title} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-lg",
        className,
      )}
    >
      <Image
        src={coverUrl}
        alt={`Filmcover von ${title}`}
        fill
        sizes="(max-width: 768px) 30vw, 140px"
        loading={eager ? "eager" : "lazy"}
        className="object-cover"
        onError={() => setHasImageError(true)}
      />
    </div>
  );
};
