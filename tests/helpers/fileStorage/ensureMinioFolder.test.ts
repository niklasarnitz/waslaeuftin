import { expect, test, describe, mock } from "bun:test";
import { ensureMinioFolder } from "../../../src/helpers/fileStorage/ensureMinioFolder";
import { Client as MinioClient } from "minio";

// We need to mock the env so that env.MINIO_BUCKET is available
mock.module("@waslaeuftin/env", () => ({
  env: {
    MINIO_BUCKET: "test-bucket",
  },
}));

describe("ensureMinioFolder", () => {
  test("throws if bucket does not exist", async () => {
    const mockClient = {
      bucketExists: mock(() => Promise.resolve(false)),
    } as unknown as MinioClient;

    await expect(ensureMinioFolder(mockClient, "test-prefix")).rejects.toThrow(
      'MinIO bucket "test-bucket" does not exist. Please create it first.',
    );
  });

  test("does not call putObject if statObject succeeds", async () => {
    const mockPutObject = mock(() => Promise.resolve());
    const mockClient = {
      bucketExists: mock(() => Promise.resolve(true)),
      statObject: mock(() => Promise.resolve({ size: 100 })),
      putObject: mockPutObject,
    } as unknown as MinioClient;

    await ensureMinioFolder(mockClient, "test-prefix");
    expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket");
    expect(mockClient.statObject).toHaveBeenCalledWith(
      "test-bucket",
      "test-prefix/.keep",
    );
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  test("calls putObject if statObject throws", async () => {
    const mockPutObject = mock(() => Promise.resolve());
    const mockClient = {
      bucketExists: mock(() => Promise.resolve(true)),
      statObject: mock(() => Promise.reject(new Error("Not found"))),
      putObject: mockPutObject,
    } as unknown as MinioClient;

    await ensureMinioFolder(mockClient, "test-prefix");
    expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket");
    expect(mockClient.statObject).toHaveBeenCalledWith(
      "test-bucket",
      "test-prefix/.keep",
    );
    expect(mockPutObject).toHaveBeenCalledWith(
      "test-bucket",
      "test-prefix/.keep",
      Buffer.from("waslaeuftin movie covers\n"),
      undefined,
      {
        "Content-Type": "text/plain; charset=utf-8",
      },
    );
  });
});
