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
  titleTags,
  additionalData,
}: {
  titleTags: string[];
  additionalData?: string | null;
}) => {
  const { tags, remainingText } = useMemo(() => {
    const parts = additionalData
      ? additionalData
          .split(" • ")
          .map((part) => part.trim())
          .filter(Boolean)
      : [];

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
      remainingText: otherParts.join(" • "),
    };
  }, [titleTags, additionalData]);

  if (tags.length === 0 && !remainingText) {
    return null;
  }

  return (
    <>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-primary"
        >
          {tag}
        </span>
      ))}
      {remainingText && (
        <span className="max-w-[240px] truncate text-[11px] font-medium text-muted-foreground">
          {remainingText}
        </span>
      )}
    </>
  );
};
