import { useMemo } from "react";

const KNOWN_TAGS = new Set([
  "imax",
  "omu",
  "omu spezial",
  "d-box",
  "atmos",
]);

const isKnownTag = (value: string) => KNOWN_TAGS.has(value.toLowerCase());

export const ShowingTags = ({
  showingId,
  titleTags,
  additionalData,
}: {
  showingId: number;
  titleTags: string[];
  additionalData?: string[] | null;
}) => {
  const { tags, otherParts } = useMemo(() => {
    const parts = additionalData ?? [];

    const matchedTags: string[] = [];
    const otherParts: string[] = [];

    for (const part of parts) {
      if (isKnownTag(part)) {
        matchedTags.push(part);
      } else {
        otherParts.push(part);
      }
    }

    const seen = new Set<string>();
    const merged: string[] = [];

    for (const tag of [...titleTags, ...matchedTags]) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(tag);
      }
    }

    return {
      tags: merged.sort((a, b) => a.localeCompare(b)),
      otherParts,
    };
  }, [titleTags, additionalData]);

  if (tags.length === 0 && otherParts.length === 0) {
    return null;
  }

  return (
    <>
      {tags.map((tag) => (
        <span
          key={`tag-${showingId}-${tag}`}
          className="whitespace-nowrap rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-primary"
        >
          {tag}
        </span>
      ))}
      {otherParts.map((part, index) => (
        <span
          key={`other-${showingId}-${part}-${index}`}
          className="whitespace-nowrap rounded-full border border-border/80 bg-white px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground dark:bg-muted/50"
        >
          {part}
        </span>
      ))}
    </>
  );
};
