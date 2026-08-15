export const extractEventAffixes = (
  title: string,
): { base: string; extracted: string[] } => {
  const extracted: string[] = [];
  let base = title;

  const prefixPatterns = [
    /^\s*(CineMathek|CineClassic|CineSneak|Senioren Kino|Kino für Senioren|Seniorenkino|Premieren Abend|VHS-Filmclub|Frühstück|Leuchtturmveranstaltung|Strickkino|SHORTS|Doku|LN)\b\s*[:-]?\s*/i,
    /^\s*(MET(?:\s+Opera)?(?:\s+\d{4}(?:\/\d{2})?|\s+\d{2}\/\d{2})?|RBO(?:\s+Live)?(?:\s+\d{4}(?:\/\d{2})?|\s+\d{2}\/\d{2})?)\s*[:-]?\s*/i,
    /^\s*(Giuseppe Verdi|Giacomo Puccini|Camille Saint-Saëns|Wolfgang Amadeus Mozart|Richard Wagner|Verdi|Puccini|Mozart)\s*:\s*/i,
  ];

  const suffixPatterns = [
    /\s*[:-]?\s*(CinePride\s*-\s*Dein PinkMonday|CinePride|PinkMonday|Kino Café|Montagsfilm|BoC|Best of Cinema|KoKi|CineSpecial|K\+K|CineMoments|Seniorenkino|Mein erster Kinobesuch|Mitmachkino|Mitmachparty|Happy Family|zum Kinofest|Kinofest)\s*$/i,
    /\s*[:-]?\s*\b(ukr\.?|arab\.?|vietnam\.?|türk\.?|span\.?|engl\.?)\s*$/i,
    /\s*[:-]?\s*(CineStricken(?:\s+in\s+[a-zäöüß]+)?)\s*$/i,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const regex of prefixPatterns) {
      const match = base.match(regex);
      if (match?.[1]) {
        extracted.push(match[1]);
        base = base.replace(regex, "");
        changed = true;
      }
    }
    for (const regex of suffixPatterns) {
      const match = base.match(regex);
      if (match?.[1]) {
        extracted.push(match[1]);
        base = base.replace(regex, "");
        changed = true;
      }
    }
  }

  return { base, extracted };
};
