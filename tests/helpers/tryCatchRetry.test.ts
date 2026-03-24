import { expect, test, describe, mock } from "bun:test";
import { tryCatchRetry } from "../../src/helpers/tryCatchRetry";

describe("tryCatchRetry", () => {
    test("should return successfully on the first try without retrying", async () => {
        const fn = mock(async () => "success");

        const result = await tryCatchRetry(fn, 3, 5);

        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test("should retry and succeed if initial attempts fail", async () => {
        let attempts = 0;
        const fn = mock(async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error("Temporary failure");
            }
            return "success after retries";
        });

        const result = await tryCatchRetry(fn, 3, 5);

        expect(result).toBe("success after retries");
        expect(fn).toHaveBeenCalledTimes(3);
    });

    test("should throw the error if all retries are exhausted", async () => {
        const fn = mock(async () => {
            throw new Error("Persistent failure");
        });

        try {
            await tryCatchRetry(fn, 2, 5);
            expect(false).toBe(true); // Should not reach here
        } catch (error: any) {
            expect(error.message).toBe("Persistent failure");
        }

        expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    test("should fail immediately if retryCount is 0", async () => {
        const fn = mock(async () => {
            throw new Error("Immediate failure");
        });

        try {
            await tryCatchRetry(fn, 0, 5);
            expect(false).toBe(true); // Should not reach here
        } catch (error: any) {
            expect(error.message).toBe("Immediate failure");
        }

        expect(fn).toHaveBeenCalledTimes(1);
    });
});
