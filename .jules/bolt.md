
## 2024-03-24 - [Avoid `Array.from(Map.values()).find(...)` in hot loops]
**Learning:** In V8/Bun, calling `Array.from` on an iterator (like `Map.values()`) inside a loop allocates an intermediate array and destroys performance (N^2 complexity). This pattern was found in the catalog resolver (`resolveAndPersistCatalog.ts`) and drastically slowed down matching when there were thousands of titles.
**Action:** For lookups within a loop, always maintain an auxiliary `Map` for O(1) retrieval instead of converting iterators to arrays.
## 2026-03-28 - [Combine filter and map chains]
**Learning:** In V8/Bun environments, replacing `.filter().map()` chains inside nested loops with a single `for...of` loop reduces intermediate array allocations, memory pressure, and dramatically speeds up processing.
**Action:** Prefer `for...of` loops that combine condition checking and transformation over chaining array methods, especially in tight or deeply nested loops.
