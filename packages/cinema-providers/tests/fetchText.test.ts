import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "bun:test";

for (const runtime of ["bun", "node"]) {
  test(`${runtime}: explicit proxy reaches the target without affecting later direct requests`, async () => {
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: (request) =>
        Response.json({
          target: request.url,
          method: request.method,
          accept: request.headers.get("accept"),
        }),
    });
    const proxy = server.url.origin;
    const target = "http://uci-test.invalid/kinoprogramm?day=2";
    const direct = `${proxy}/direct`;
    const moduleUrl = new URL("../src/fetchText.ts", import.meta.url).href;
    try {
      const { stdout } = await promisify(execFile)(runtime, [
        ...(runtime === "node" ? ["--input-type=module"] : []),
        "--eval",
        `
          import { fetchTextWithBun } from ${JSON.stringify(moduleUrl)};
          const proxied = await fetchTextWithBun(${JSON.stringify(target)}, { Accept: "text/html" }, "POST", ${JSON.stringify(proxy)});
          process.env.WASLAEUFTIN_FETCH_PROXY = "http://127.0.0.1:1";
          const direct = await fetchTextWithBun(${JSON.stringify(direct)}, { Accept: "application/json" });
          console.log(JSON.stringify([proxied, direct]));
        `,
      ]);
      expect(JSON.parse(stdout)).toEqual([
        {
          status: 200,
          body: JSON.stringify({ target, method: "POST", accept: "text/html" }),
          cookies: [],
        },
        {
          status: 200,
          body: JSON.stringify({
            target: direct,
            method: "GET",
            accept: "application/json",
          }),
          cookies: [],
        },
      ]);
    } finally {
      await server.stop(true);
    }
  });
}
