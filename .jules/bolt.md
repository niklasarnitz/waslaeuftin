
## 2024-03-24 - [Avoid `Array.from(Map.values()).find(...)` in hot loops]
**Learning:** In V8/Bun, calling `Array.from` on an iterator (like `Map.values()`) inside a loop allocates an intermediate array and destroys performance (N^2 complexity). This pattern was found in the catalog resolver (`resolveAndPersistCatalog.ts`) and drastically slowed down matching when there were thousands of titles.
**Action:** For lookups within a loop, always maintain an auxiliary `Map` for O(1) retrieval instead of converting iterators to arrays.

## 2025-02-14 - [Cache expensive string operations and eliminate chained map/filter in hot loops]
**Learning:** Chaining array methods like `.filter().map()` inside nested loops (e.g., iterating through cinemas, movies, and showings) results in redundant intermediate array allocations. Furthermore, repeatedly applying complex string/Regex manipulations like `normalizeMovieTitle` to identical strings within these hot loops drastically slows down the application.
**Action:** Replace chained `.filter().map()` with a single `for...of` loop. Maintain a local `Map` cache inside the function to memoize the results of expensive operations (e.g., string normalization or Regex processing) by using the raw input string as the key.
