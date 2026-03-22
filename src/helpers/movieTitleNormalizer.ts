const METADATA_MARKERS = [
  "ov",
  "omu",
  "omeu",
  "2d",
  "3d",
  "imax",
  "dolby",
  "atmos",
  "preview",
  "sneak",
  "fsk",
  "dt fassung",
  "deutsche fassung",
  "original version",
  "originalfassung",
  "untertitel",
  "english",
  "70mm",
  "35mm",
  "4k",
  "hfr",
  "screenx",
  "4dx",
  "laser",
];

const TAG_PATTERN =
  /\b(OV|OmU|OmEU|2D|3D|IMAX|Dolby\s*Atmos|Dolby|Preview|Sneak|English|Dt\.?\s*Fassung|Deutsche\s*Fassung|Original\s*Version|70mm|35mm|4K|HFR|ScreenX|4DX|Laser)\b/gi;

const normalizeForTagCheck = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const extractBracketTags = (title: string): string[] => {
  const tags: string[] = [];

  title.replace(/\(([^)]*)\)/g, (_full, section: string) => {
    const normalized = normalizeForTagCheck(section);

    if (normalized.length === 0) {
      return "";
    }

    const isMetadata = METADATA_MARKERS.some((marker) =>
      normalized.includes(marker),
    );

    if (isMetadata) {
      const parts = (section as string)
        .split(/[,/]+/)
        .map((part) => part.trim())
        .filter(Boolean);

      tags.push(...parts);
    }

    return "";
  });

  return tags;
};

const extractStandaloneTags = (title: string): string[] => {
  const tags: string[] = [];
  let match;

  const tagRegex = new RegExp(TAG_PATTERN.source, TAG_PATTERN.flags);

  while ((match = tagRegex.exec(title)) !== null) {
    const tag = match[1]!;
    const beforeIndex = match.index - 1;
    const afterIndex = match.index + match[0].length;

    const isInsideBrackets =
      title.lastIndexOf("(", match.index) > title.lastIndexOf(")", match.index);

    if (!isInsideBrackets) {
      const isBoundary = (index: number) =>
        index < 0 ||
        index >= title.length ||
        /[\s,/|;–—-]/.test(title[index]!);

      if (isBoundary(beforeIndex) && isBoundary(afterIndex)) {
        tags.push(tag);
      }
    }
  }

  return tags;
};

const canonicalizeTag = (tag: string): string => {
  const normalized = tag.trim().toLowerCase().replace(/\s+/g, " ");

  const mapping: Record<string, string> = {
    ov: "OV",
    omu: "OmU",
    omeu: "OmEU",
    "2d": "2D",
    "3d": "3D",
    imax: "IMAX",
    dolby: "Dolby",
    "dolby atmos": "Dolby Atmos",
    preview: "Preview",
    sneak: "Sneak",
    english: "English",
    "70mm": "70mm",
    "35mm": "35mm",
    "4k": "4K",
    hfr: "HFR",
    screenx: "ScreenX",
    "4dx": "4DX",
    laser: "Laser",
  };

  return mapping[normalized] ?? tag.trim();
};

export type NormalizedMovieTitle = {
  baseTitle: string;
  tags: string[];
};

export const normalizeMovieTitle = (title: string): NormalizedMovieTitle => {
  const bracketTags = extractBracketTags(title);

  const withoutMetadataBrackets = title
    .replace(/\(([^)]*)\)/g, (_full, section: string) => {
      const normalized = normalizeForTagCheck(section);
      if (normalized.length === 0) return " ";
      const isMetadata = METADATA_MARKERS.some((marker) =>
        normalized.includes(marker),
      );
      return isMetadata ? " " : _full;
    })
    .trim();

  const standaloneTags = extractStandaloneTags(withoutMetadataBrackets);

  const baseTitle = withoutMetadataBrackets
    .replace(TAG_PATTERN, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+-\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const allTags = [...bracketTags, ...standaloneTags];
  const uniqueTags: string[] = [];
  const seen = new Set<string>();

  for (const tag of allTags) {
    const canonical = canonicalizeTag(tag);
    const key = canonical.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTags.push(canonical);
    }
  }

  return {
    baseTitle: baseTitle || title.trim(),
    tags: uniqueTags,
  };
};
