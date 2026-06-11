import { normalizeForComparison } from "@waslaeuftin/helpers/titleNormalization/normalizeForComparison";

export const slugifyForObjectKey = (value: string) => {
  const normalized = normalizeForComparison(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

  return normalized.length > 0 ? normalized : "movie";
};
