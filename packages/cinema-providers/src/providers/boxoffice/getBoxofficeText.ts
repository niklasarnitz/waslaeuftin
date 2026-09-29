import type { RawResponse } from "@waslaeuftin/cinema-providers/internal/fetchText";
import {
  describeFailedResponse,
  fetchText,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

// Cineworld's site sometimes answers 403 behind a bot challenge. Try a plain
// fetch with a browser User-Agent first, then Bun's fetch with its default
// User-Agent (which gets past Comtrada's Cloudflare, see fetchText.ts). The
// strategy that worked is remembered per host, so a run doesn't pay for the
// failing one on every request.

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

type Strategy = (url: string) => Promise<RawResponse>;

const strategies: Strategy[] = [
  (url) => fetchText(url, BROWSER_HEADERS),
  (url) => fetchTextWithBun(url, {}),
];

const workingStrategyByHost = new Map<string, number>();

const isOk = (response: RawResponse) =>
  response.status >= 200 && response.status < 300;

const isBlocked = (response: RawResponse) =>
  response.status === 403 || response.status === 429;

export const getBoxofficeText = async (url: string): Promise<string> => {
  const host = new URL(url).host;
  const firstStrategy = workingStrategyByHost.get(host) ?? 0;

  let lastResponse: RawResponse | undefined;

  for (let index = firstStrategy; index < strategies.length; index++) {
    const strategy = strategies[index];
    if (!strategy) break;

    const response = await strategy(url);

    if (isOk(response)) {
      if (index !== firstStrategy) {
        console.info(
          `[Boxoffice] ${host} answered ${lastResponse?.status} to a browser User-Agent; using Bun's default User-Agent`,
        );
      }
      workingStrategyByHost.set(host, index);
      return response.body;
    }

    lastResponse = response;
    if (!isBlocked(response)) break;
  }

  throw new Error(
    lastResponse
      ? `${url}: ${describeFailedResponse(lastResponse)}`
      : `Request to ${url} failed`,
  );
};

export const getBoxofficeJson = async <T>(url: string): Promise<T> =>
  JSON.parse(await getBoxofficeText(url)) as T;
