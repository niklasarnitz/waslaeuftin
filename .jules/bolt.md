## 2024-05-18 - [React Render Loop O(N^2) Optimization]
**Learning:** In React render loops, using `Array.indexOf()` within a `.map()` over concatenated arrays creates an O(N^2) bottleneck. The memory states that we should calculate the flat index directly from the map's index and the preceding array's length.
**Action:** Replace `indexOf` in `.map()` with O(1) mathematical index calculation when mapping over subset arrays.

## 2024-05-19 - [Prisma $transaction Sequential Execution Timeout]
**Learning:** When passing an array of promises (e.g., mapped upsert queries) to `db.$transaction()`, Prisma executes them sequentially rather than concurrently. Passing a large array directly (e.g., 200 items) can easily exceed the default 5000ms interactive transaction timeout, causing failures under load.
**Action:** Always batch array promises into smaller chunks (e.g., batches of 50) and execute `$transaction` separately for each chunk to prevent timeouts during bulk sequential operations.
