import {
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { afterEach, describe, expect, mock, test } from "bun:test";

const uploadedBodies: Uint8Array[] = [];

mock.module("@waslaeuftin/env", () => ({
  env: {
    S3_BUCKET: "covers",
    TMDB_IMAGE_BASE_URL: "https://image.tmdb.test/t/p",
    TMDB_POSTER_SIZE: "w780",
  },
}));
mock.module("@aws-sdk/lib-storage", () => ({
  Upload: class MockUpload {
    constructor(
      private readonly options: { params: { Body: ReadableStream } },
    ) {}

    async done() {
      const bytes = await new Response(this.options.params.Body).bytes();
      uploadedBodies.push(bytes);
    }
  },
}));

const notFound = () =>
  new S3ServiceException({
    name: "NotFound",
    $fault: "client",
    $metadata: { httpStatusCode: 404 },
  });

const createClient = (headResult: "exists" | "missing") => {
  const send = mock(async (command: unknown) => {
    if (command instanceof HeadObjectCommand && headResult === "missing") {
      throw notFound();
    }
    return {};
  });

  return { client: { send } as unknown as S3Client, send };
};

const originalFetch = globalThis.fetch;
const mockFetch = (response: Response) => {
  const fetchMock = mock(async (_input: RequestInfo | URL) => response);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

describe("storeTmdbPosterObject", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    uploadedBodies.length = 0;
  });

  test("skips download and upload when the object already exists", async () => {
    const { storeTmdbPosterObject } =
      await import("@waslaeuftin/helpers/fileStorage/storeTmdbPosterObject");
    const { client } = createClient("exists");
    const fetchMock = mockFetch(new Response("unused"));

    await storeTmdbPosterObject(client, "/poster.jpg", "covers/poster.jpg");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(uploadedBodies).toHaveLength(0);
  });

  test("streams the poster to S3 when the object is missing", async () => {
    const { storeTmdbPosterObject } =
      await import("@waslaeuftin/helpers/fileStorage/storeTmdbPosterObject");
    const { client } = createClient("missing");
    const fetchMock = mockFetch(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/jpeg" },
      }),
    );

    await storeTmdbPosterObject(client, "/poster.jpg", "covers/poster.jpg");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://image.tmdb.test/t/p/w780/poster.jpg",
    );
    expect(uploadedBodies).toEqual([new Uint8Array([1, 2, 3])]);
  });

  test("rejects non-image responses", async () => {
    const { storeTmdbPosterObject } =
      await import("@waslaeuftin/helpers/fileStorage/storeTmdbPosterObject");
    const { client } = createClient("missing");
    mockFetch(
      new Response("<html></html>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    await expect(
      storeTmdbPosterObject(client, "/poster.jpg", "covers/poster.jpg"),
    ).rejects.toThrow('non-image content type "text/html"');
    expect(uploadedBodies).toHaveLength(0);
  });

  test("deletes the object again when the download was empty", async () => {
    const { storeTmdbPosterObject } =
      await import("@waslaeuftin/helpers/fileStorage/storeTmdbPosterObject");
    const { client, send } = createClient("missing");
    mockFetch(
      new Response(new ReadableStream({ start: (c) => c.close() }), {
        headers: { "content-type": "image/jpeg" },
      }),
    );

    await expect(
      storeTmdbPosterObject(client, "/poster.jpg", "covers/poster.jpg"),
    ).rejects.toThrow("empty payload");
    expect(
      send.mock.calls.some(
        ([command]) => command instanceof DeleteObjectCommand,
      ),
    ).toBe(true);
  });
});
