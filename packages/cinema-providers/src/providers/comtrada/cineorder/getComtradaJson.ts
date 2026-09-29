import { execFile } from "node:child_process";

// Comtrada's Cloudflare returns 403 for every request made from Node (fetch or
// node:https, whatever the headers), but lets Bun's fetch through. The Next.js
// server may run on Node, so there we run the request in a short-lived Bun
// process. Under Bun (CLI scripts, tests) we fetch directly.
//
// Keep Bun's default User-Agent: a spoofed browser User-Agent (e.g. Chrome) is
// blocked too, even from Bun.

const TIMEOUT_MS = 60_000;
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

type RawResponse = { status: number; body: string };

const fetchRaw = async (
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
const url = process.env.COMTRADA_URL;
const headers = JSON.parse(process.env.COMTRADA_HEADERS);
const response = await fetch(url, { headers });
process.stdout.write(JSON.stringify({ status: response.status, body: await response.text() }));
`;

const fetchRawWithBun = (
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
          COMTRADA_URL: url,
          COMTRADA_HEADERS: JSON.stringify(headers),
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

export const getComtradaJson = async <T>(
  url: string,
  headers: Record<string, string>,
): Promise<T> => {
  const { status, body } = process.versions.bun
    ? await fetchRaw(url, headers)
    : await fetchRawWithBun(url, headers);

  if (status < 200 || status >= 300) {
    const snippet = body.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`Request failed with status code ${status}: ${snippet}`);
  }

  return JSON.parse(body) as T;
};
