import type { RawResponse } from "@waslaeuftin/cinema-providers/internal/fetchText";
import type { OdeonApiConfig } from "@waslaeuftin/cinema-providers/internal/providers/odeon/types/OdeonOcapi";
import {
  describeFailedResponse,
  fetchText,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

export const ODEON_BASE_URL = "https://www.odeon.co.uk";
const DEFAULT_ODEON_API_URL = "https://vwc.odeon.co.uk/WSVistaWebClient";

// Refresh the token this long before its JWT expiry.
const TOKEN_EXPIRY_MARGIN_MS = 10 * 60 * 1000;
// Used when the token has no readable `exp` claim.
const TOKEN_FALLBACK_TTL_MS = 60 * 60 * 1000;

const CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

// odeon.co.uk is behind Cloudflare. Try a realistic browser request first, then
// Bun's default User-Agent (which is what got Comtrada's Cloudflare to answer).
const HOME_PAGE_REQUESTS: { name: string; headers: Record<string, string> }[] =
  [
    {
      name: "browser User-Agent",
      headers: {
        "User-Agent": CHROME_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    },
    { name: "Bun default User-Agent", headers: {} },
  ];

const unescapeJsString = (value: string) =>
  value.replace(/\\\//g, "/").replace(/\\u002F/gi, "/");

const getJwtExpiry = (token: string): number | undefined => {
  const payload = token.split(".")[1];
  if (!payload) return undefined;

  try {
    const { exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof exp === "number" ? exp * 1000 : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Reads `window.initialData.api` (`apiUrl` + `authToken`) from the raw HTML of
 * an odeon.co.uk page.
 */
export const parseOdeonApiConfig = (html: string): OdeonApiConfig | null => {
  const authToken =
    /["']?authToken["']?\s*:\s*["'](eyJ[\w-]+\.[\w-]+\.[\w-]+)["']/.exec(
      html,
    )?.[1];
  if (!authToken) return null;

  const apiUrl =
    /["']?apiUrl["']?\s*:\s*["'](https?:[^"']+)["']/.exec(html)?.[1] ??
    DEFAULT_ODEON_API_URL;

  return {
    apiUrl: unescapeJsString(apiUrl).replace(/\/+$/, ""),
    authToken,
    expiresAt: getJwtExpiry(authToken),
  };
};

const loadOdeonApiConfig = async (): Promise<OdeonApiConfig> => {
  const failures: string[] = [];

  for (const request of HOME_PAGE_REQUESTS) {
    let response: RawResponse;
    try {
      response = await fetchTextWithBun(`${ODEON_BASE_URL}/`, request.headers);
    } catch (error) {
      failures.push(
        `${request.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      failures.push(`${request.name}: ${describeFailedResponse(response)}`);
      continue;
    }

    const config = parseOdeonApiConfig(response.body);
    if (config) {
      console.info(`[Odeon] Got API token from odeon.co.uk (${request.name})`);
      return config;
    }

    failures.push(`${request.name}: no authToken in the page`);
  }

  throw new Error(
    `Could not get an ODEON API token from odeon.co.uk: ${failures.join("; ")}`,
  );
};

// Wait this long before fetching the token again after a failed attempt, so
// a blocked home page fails the run fast instead of being hit per request.
const TOKEN_RETRY_DELAY_MS = 60 * 1000;

type TokenState =
  | { status: "loading"; promise: Promise<OdeonApiConfig> }
  | { status: "ready"; config: OdeonApiConfig }
  | { status: "failed"; error: Error; failedAt: number };

let tokenState: TokenState | undefined;

const isExpired = (config: OdeonApiConfig) =>
  Date.now() >= (config.expiresAt ?? 0) - TOKEN_EXPIRY_MARGIN_MS;

/**
 * The API URL and bearer token, shared by all requests of a run. The token is
 * fetched once and reused until shortly before it expires.
 */
export const getOdeonApiConfig = (): Promise<OdeonApiConfig> => {
  if (tokenState?.status === "loading") return tokenState.promise;
  if (tokenState?.status === "ready" && !isExpired(tokenState.config)) {
    return Promise.resolve(tokenState.config);
  }
  if (
    tokenState?.status === "failed" &&
    Date.now() - tokenState.failedAt < TOKEN_RETRY_DELAY_MS
  ) {
    return Promise.reject(tokenState.error);
  }

  const promise = loadOdeonApiConfig().then(
    (loaded) => {
      const config = {
        ...loaded,
        expiresAt: loaded.expiresAt ?? Date.now() + TOKEN_FALLBACK_TTL_MS,
      };
      tokenState = { status: "ready", config };
      return config;
    },
    (error: unknown) => {
      const failure = error instanceof Error ? error : new Error(String(error));
      tokenState = { status: "failed", error: failure, failedAt: Date.now() };
      throw failure;
    },
  );
  tokenState = { status: "loading", promise };
  return promise;
};

// Drops the cached token, unless a concurrent request already replaced it.
const invalidateOdeonApiConfig = (config: OdeonApiConfig) => {
  if (
    tokenState?.status === "ready" &&
    tokenState.config.authToken === config.authToken
  ) {
    tokenState = undefined;
  }
};

const requestOdeonApi = async (
  config: OdeonApiConfig,
  path: string,
): Promise<RawResponse> => {
  const url = `${config.apiUrl}${path}`;
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${config.authToken}`,
  };

  const response = await fetchText(url, headers);
  // Same Cloudflare fallback as the home page: retry a 403 from Node with Bun.
  if (response.status === 403 && !process.versions.bun) {
    return fetchTextWithBun(url, headers);
  }
  return response;
};

/** GET an OCAPI path (e.g. `/ocapi/v1/sites`) with the cached bearer token. */
export const getOdeonJson = async <T>(path: string): Promise<T> => {
  let config = await getOdeonApiConfig();
  let response = await requestOdeonApi(config, path);

  if (response.status === 401) {
    // The token was revoked or expired early: get a fresh one and retry once.
    invalidateOdeonApiConfig(config);
    config = await getOdeonApiConfig();
    response = await requestOdeonApi(config, path);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`ODEON API ${path}: ${describeFailedResponse(response)}`);
  }

  return JSON.parse(response.body) as T;
};
