import {
  describeFailedResponse,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

// Comtrada's Cloudflare returns 403 for every request made from Node, but lets
// Bun's fetch through (see fetchTextWithBun).
//
// Keep Bun's default User-Agent: a spoofed browser User-Agent (e.g. Chrome) is
// blocked too, even from Bun.
export const getComtradaJson = async <T>(
  url: string,
  headers: Record<string, string>,
): Promise<T> => {
  const response = await fetchTextWithBun(url, headers);

  if (response.status < 200 || response.status >= 300) {
    throw new Error(describeFailedResponse(response));
  }

  return JSON.parse(response.body) as T;
};
