import { prepareMovieTitle } from "./prepareMovieTitle";

/** Production brands/seasons must not collapse into the underlying work name. */
export const getScreenedPerformance = (rawTitle: string) => {
  const title = prepareMovieTitle(rawTitle);
  const brand =
    /\bMET\b(?=\s*(?::|Opera\b|live\b|(?:19|20)\d{2}\b))|\bMetropolitan Opera\b/i.test(
      title,
    )
      ? "MET"
      : /\bRBO\b|\bRoyal (?:Ballet|Opera)\b/i.test(title)
        ? "RBO"
        : /^(?:Verdi|Puccini|Mozart|Massenet|Giuseppe Verdi|Giacomo Puccini|Jules Massenet)\s*:/i.test(
              title,
            )
          ? "unspecified"
          : null;
  if (!brand) return null;
  const season = /\b((?:19|20)\d{2})\s*[/–—-]\s*(\d{2}|\d{4})\b/.exec(title);
  return {
    brand,
    season: season ? `${season[1]}/${season[2]?.slice(-2)}` : null,
  };
};
