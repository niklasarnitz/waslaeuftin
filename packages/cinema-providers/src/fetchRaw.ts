import { execFile } from "node:child_process";

// Some providers sit behind bot protection that treats runtimes differently:
// Comtrada's Cloudflare returns 403 for every request made from Node (fetch or
// node:https, whatever the headers), but lets Bun's fetch through. The Next.js
// server may run on Node, so `fetchRawWithBun` runs the request in a
// short-lived Bun process there. Under Bun (CLI scripts, tests) it fetches
// directly.

const TIMEOUT_MS = 60_000;
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

export interface RawResponse {
  status: number;
  body: string;
}

/** Fetches in the current process (Node's or Bun's fetch). */
export const fetchRaw = async (
  url: string,
  headers: Record<string, string>,
): Promise<RawResponse> => {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: response.status, body: await response.text() };
};

// Runs in the Bun subprocess and prints a RawResponse.
const BUN_FETCH_SCRIPT = `
const url = process.env.FETCH_RAW_URL;
const headers = JSON.parse(process.env.FETCH_RAW_HEADERS);
const response = await fetch(url, { headers });
process.stdout.write(JSON.stringify({ status: response.status, body: await response.text() }));
`;

const fetchRawInBunProcess = (
  url: string,
  headers: Record<string, string>,
): Promise<RawResponse> =>
  new Promise((resolve, reject) => {
    execFile(
      "bun",
      ["-e", BUN_FETCH_SCRIPT],
      {
        env: {
          ...process.env,
          FETCH_RAW_URL: url,
          FETCH_RAW_HEADERS: JSON.stringify(headers),
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

/** Fetches with Bun's fetch, spawning Bun when running on Node. */
export const fetchRawWithBun = (
  url: string,
  headers: Record<string, string>,
): Promise<RawResponse> =>
  process.versions.bun
    ? fetchRaw(url, headers)
    : fetchRawInBunProcess(url, headers);

export const describeFailedResponse = (url: string, response: RawResponse) => {
  const snippet = response.body.slice(0, 200).replace(/\s+/g, " ");
  return `Request to ${url} failed with status code ${response.status}: ${snippet}`;
};
