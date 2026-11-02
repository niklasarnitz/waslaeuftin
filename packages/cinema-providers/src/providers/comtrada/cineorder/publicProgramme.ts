import { load } from "cheerio";

import {
  describeFailedResponse,
  fetchText,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

export const fetchProgramme = async (url: string) => {
  const response = await fetchText(url, {});
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${url}: ${describeFailedResponse(response)}`);
  }
  return load(response.body);
};

/** Reads a JSON object embedded by the public site, without executing its scripts. */
export const readProgrammeData = <T>(
  $: ReturnType<typeof load>,
  variable: string,
): T => {
  for (const script of $("script").toArray()) {
    const text = $(script).text();
    const assignment = new RegExp(`\\bvar\\s+${variable}\\s*=\\s*`).exec(text);
    if (!assignment) continue;
    const start = assignment.index + assignment[0].length;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        return JSON.parse(text.slice(start, i + 1)) as T;
      }
    }
  }
  throw new Error(`Public programme is missing ${variable} data`);
};
