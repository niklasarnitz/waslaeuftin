import { execFile } from "node:child_process";

// Some providers sit behind a Cloudflare setup that returns 403 for every
// request made from Node (fetch or node:https, whatever the headers) but lets
// Bun's fetch through. The Next.js server may run on Node, so there we run the
// request in a short-lived Bun process. Under Bun (CLI scripts, tests) we fetch
// directly.

const TIMEOUT_MS = 60_000;
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

export interface RawResponse {
  status: number;
  body: string;
  cookies?: string[];
}

export const fetchText = async (
  url: string,
  headers: Record<string, string>,
  method: "GET" | "POST" = "GET",
): Promise<RawResponse> => {
  const response = await fetch(url, {
    headers,
    method,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return {
    status: response.status,
    body: await response.text(),
    cookies: response.headers.getSetCookie(),
  };
};

// Runs in the Bun subprocess and prints a RawResponse.
const BUN_FETCH_SCRIPT = `
const url = process.env.WASLAEUFTIN_FETCH_URL;
const headers = JSON.parse(process.env.WASLAEUFTIN_FETCH_HEADERS);
const response = await fetch(url, { headers, method: process.env.WASLAEUFTIN_FETCH_METHOD });
process.stdout.write(JSON.stringify({ status: response.status, body: await response.text(), cookies: response.headers.getSetCookie() }));
`;

const fetchTextInBunProcess = (
  url: string,
  headers: Record<string, string>,
  method: "GET" | "POST" = "GET",
): Promise<RawResponse> =>
  new Promise((resolve, reject) => {
    execFile(
      "bun",
      ["-e", BUN_FETCH_SCRIPT],
      {
        env: {
          ...process.env,
          WASLAEUFTIN_FETCH_URL: url,
          WASLAEUFTIN_FETCH_METHOD: method,
          WASLAEUFTIN_FETCH_HEADERS: JSON.stringify(headers),
        },
        timeout: TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `Bun fetch for ${url} failed: ${stderr.trim() || error.message}`,
            ),
          );
          return;
        }
        try {
          resolve(JSON.parse(stdout) as RawResponse);
        } catch {
          reject(new Error(`Bun fetch for ${url} returned invalid output`));
        }
      },
    );
  });

/** Fetches with Bun's fetch: directly under Bun, in a Bun subprocess under Node. */
export const fetchTextWithBun = (
  url: string,
  headers: Record<string, string>,
  method: "GET" | "POST" = "GET",
): Promise<RawResponse> =>
  process.versions.bun
    ? fetchText(url, headers, method)
    : fetchTextInBunProcess(url, headers, method);

export const describeFailedResponse = ({ status, body }: RawResponse) => {
  const snippet = body.slice(0, 200).replace(/\s+/g, " ");
  return `Request failed with status code ${status}: ${snippet}`;
};
