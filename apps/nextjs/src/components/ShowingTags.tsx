"use client";

import { useMemo } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@waslaeuftin/components/ui/tooltip";
import { categorizeShowingTags } from "@waslaeuftin/helpers/showingTags/categorizeShowingTags";

export const ShowingTags = ({
  showingId,
  titleTags,
  additionalData,
}: {
  showingId: number;
  titleTags: string[];
  additionalData?: string[] | null;
}) => {
  const { prominentTags, infoItems } = useMemo(
    () => categorizeShowingTags(titleTags, additionalData),
    [titleTags, additionalData],
  );

  if (prominentTags.length === 0 && infoItems.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {prominentTags.map((tag) => (
        <span
          key={`tag-${showingId}-${tag}`}
          className="bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold uppercase whitespace-nowrap"
        >
          {tag}
        </span>
      ))}
      {infoItems.length > 0 && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger
              asChild
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <span
                role="button"
                tabIndex={0}
                className="border-border/80 text-muted-foreground hover:border-foreground/50 hover:bg-muted/80 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-muted/30 text-[10px] leading-none font-bold italic transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Vorstellungsinformationen"
              >
                i
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-popover text-popover-foreground max-w-xs border border-border px-2.5 py-1.5 shadow-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="flex flex-col gap-1 text-[11px]">
                {infoItems.map((item, index) => (
                  <div
                    key={`info-${showingId}-${index}`}
                    className="flex items-center gap-1.5"
                  >
                    <span className="bg-primary h-1 w-1 shrink-0 rounded-full" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );
};
