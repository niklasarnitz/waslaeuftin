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
        if (!matchedRuleIds.has(rule.id)) {
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
      if (!infoItems.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
        infoItems.push(trimmed);
      }
    }
  };

  for (const tag of titleTags) {
    processItem(tag, true);
  }

  for (const part of parts) {
    processItem(part, false);
  }

  const prominentTags = Array.from(prominentMap.values())
    .sort((a, b) => a.order - b.order)
    .map((item) => item.label);

  return {
    prominentTags,
    infoItems,
  };
}

export type ShowingFilterOptions = {
  selectedTags: string[]; // e.g. ["OV", "OmU", "3D", "IMAX", "70mm/35mm", "Atmos"]
  timeWindow: "all" | "14" | "18" | "21"; // "14" = ab 14:00, "18" = ab 18:00, "21" = ab 21:00
};

export function isShowingMatchingFilters(
  showingDateTime: Date | string,
  showingTags: string[],
  filters: ShowingFilterOptions,
): boolean {
  // 1. Time filter
  if (filters.timeWindow !== "all") {
    const d =
      showingDateTime instanceof Date
        ? showingDateTime
        : new Date(showingDateTime);
    if (!isNaN(d.getTime())) {
      const hour = d.getHours();
      const minHour = parseInt(filters.timeWindow, 10);
      if (hour < minHour) {
        return false;
      }
    }
  }

  // 2. Tags filter
  if (filters.selectedTags.length > 0) {
    const { prominentTags } = categorizeShowingTags([], showingTags);
    const prominentUpper = prominentTags.map((t) => t.toUpperCase());

    for (const filterTag of filters.selectedTags) {
      const targetUpper = filterTag.toUpperCase();
      if (targetUpper === "70MM" || targetUpper === "35MM" || targetUpper === "70MM/35MM") {
        if (!prominentUpper.includes("70MM") && !prominentUpper.includes("35MM")) {
          return false;
        }
      } else if (targetUpper === "IMAX") {
        if (!prominentUpper.includes("IMAX") && !prominentUpper.includes("IMAX 3D")) {
          return false;
        }
      } else {
        if (!prominentUpper.includes(targetUpper)) {
          return false;
        }
      }
    }
  }

  return true;
}

