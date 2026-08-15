export type CategorizedShowingTags = {
  prominentTags: string[];
  infoItems: string[];
};

type ProminentRule = {
  id: string;
  label: string;
  regex: RegExp;
  order: number;
};

const PROMINENT_RULES: ProminentRule[] = [
  // Version / Language
  { id: "ov", label: "OV", regex: /\b(ov|originalversion|original\s*version|subtitled\s*ov|ov\s*\(originalversion\)|ov\s*\(englisch\)|english|englisch)\b/i, order: 10 },
  { id: "omu", label: "OmU", regex: /\b(omu|omud|original\s*mit\s*untertitel|omu\s*\(original\s*mit\s*untertitel\))\b/i, order: 11 },
  { id: "omeu", label: "OmeU", regex: /\bomeu\b/i, order: 12 },
  { id: "omeu_eu", label: "OmEU", regex: /\bomeu\b/i, order: 13 },

  // Special / Film Formats
  { id: "70mm", label: "70mm", regex: /\b70\s*-?\s*mm\b/i, order: 20 },
  { id: "35mm", label: "35mm", regex: /\b35\s*-?\s*mm\b/i, order: 21 },
  { id: "imax_3d", label: "IMAX 3D", regex: /\bimax\s*3d\b/i, order: 22 },
  { id: "imax", label: "IMAX", regex: /\bimax\b/i, order: 23 },

  // Projection / Visual
  { id: "3d", label: "3D", regex: /\b3d\b/i, order: 30 },
  { id: "4k", label: "4K", regex: /\b4k\b/i, order: 31 },
  { id: "laser", label: "Laser", regex: /\blaser\b/i, order: 32 },
  { id: "hfr", label: "HFR", regex: /\bhfr\b/i, order: 33 },
  { id: "screenx", label: "ScreenX", regex: /\b(screenx|screen\s*x)\b/i, order: 34 },
  { id: "4dx", label: "4DX", regex: /\b4dx\b/i, order: 35 },
  { id: "2d", label: "2D", regex: /\b2d\b/i, order: 36 },

  // Experience / Sound / Motion
  { id: "atmos", label: "Atmos", regex: /\b(dolby\s*atmos|atmos)\b/i, order: 40 },
  { id: "dbox", label: "D-BOX", regex: /\b(d-box|dbox)\b/i, order: 41 },
  { id: "dolby_cinema", label: "Dolby Cinema", regex: /\bdolby\s*cinema\b/i, order: 42 },
  { id: "vmax", label: "V-MAX", regex: /\b(v-max|vmax)\b/i, order: 43 },
  { id: "onyx", label: "Onyx", regex: /\bonyx\b/i, order: 44 },
];

export function categorizeShowingTags(
  titleTags: string[] = [],
  additionalData?: string[] | null
): CategorizedShowingTags {
  const parts = additionalData ?? [];

  const matchedRuleIds = new Set<string>();
  const prominentMap = new Map<string, { label: string; order: number }>();
  const infoItems: string[] = [];

  const processItem = (item: string, isFromTitle: boolean) => {
    const trimmed = item.trim();
    if (!trimmed) return;

    let matchedProminent = false;

    for (const rule of PROMINENT_RULES) {
      if (rule.regex.test(trimmed)) {
        matchedProminent = true;
        // Avoid duplicate labels for same category (e.g. if IMAX 3D matched, don't duplicate IMAX if IMAX 3D is already added)
        if (!matchedRuleIds.has(rule.id)) {
          // Special case: if IMAX 3D matched, mark IMAX as well so IMAX alone is not added separately
          if (rule.id === "imax_3d") {
            matchedRuleIds.add("imax");
            matchedRuleIds.add("3d");
          }
          matchedRuleIds.add(rule.id);
          prominentMap.set(rule.id, { label: rule.label, order: rule.order });
        }
      }
    }

    if (!matchedProminent && !isFromTitle) {
      // Check if infoItem is duplicate
      if (!infoItems.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
        infoItems.push(trimmed);
      }
    }
  };

  // Process title tags first
  for (const tag of titleTags) {
    processItem(tag, true);
  }

  // Process additional data from DB
  for (const part of parts) {
    processItem(part, false);
  }

  // Sort prominent tags by logical display order
  const prominentTags = Array.from(prominentMap.values())
    .sort((a, b) => a.order - b.order)
    .map((item) => item.label);

  return {
    prominentTags,
    infoItems,
  };
}
