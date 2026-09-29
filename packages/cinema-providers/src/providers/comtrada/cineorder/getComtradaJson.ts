import { fetchRawWithBun } from "@waslaeuftin/cinema-providers/internal/fetchRaw";

// Comtrada's Cloudflare returns 403 for every request made from Node, but lets
// Bun's fetch through (see fetchRaw.ts).
//
// Keep Bun's default User-Agent: a spoofed browser User-Agent (e.g. Chrome) is
// blocked too, even from Bun.
export const getComtradaJson = async <T>(
  url: string,
  headers: Record<string, string>,
): Promise<T> => {
  const { status, body } = await fetchRawWithBun(url, headers);

  if (status < 200 || status >= 300) {
    const snippet = body.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`Request failed with status code ${status}: ${snippet}`);
  }

  return JSON.parse(body) as T;
};
