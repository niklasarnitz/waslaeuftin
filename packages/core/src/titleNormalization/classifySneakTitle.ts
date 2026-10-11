import { smartReplaceUnderscores } from "./smartReplaceUnderscores";

/** A surprise screening has metadata, but no announced movie identity. */
export const classifySneakTitle = (rawTitle: string) => {
  const title = smartReplaceUnderscores(rawTitle).trim();
  const withoutBrackets = title.replace(/\([^)]*\)/g, " ").trim();
  // These are actual film titles, not surprise-screening labels.
  if (
    /^Sneak Over(?:\s+(?:OV|OmU|OmEU|2D|3D|70mm|4K))*$/i.test(withoutBrackets)
  ) {
    return { isUnannounced: false, tags: [] as string[] };
  }
  const sneakPattern =
    /(?:^|[\s._:/"–—-])(?:cine|kult|thrill)?sneak(?:$|[\s._:/)–—-]|preview)|\bsneaky\s+(?:frights|friday)\b/i;
  const isUnannounced = sneakPattern.test(withoutBrackets);
  const isSneak = isUnannounced || /\(\s*sneak\s*\)/i.test(title);
  const tags: string[] = [];
  if (isSneak) {
    tags.push("Sneak");
    if (
      /\bov\b|\boriginal(?:s|version|\s+version)?\b|\benglish\b|\benglisch\b/i.test(
        title,
      )
    )
      tags.push("OV");
    if (/\bomu\b/i.test(title)) tags.push("OmU");
    if (/\bomeu\b/i.test(title)) tags.push("OmEU");
  }
  return { isUnannounced, tags };
};
