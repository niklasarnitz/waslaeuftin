
## 2024-03-24 - [Avoid `Array.from(Map.values()).find(...)` in hot loops]
**Learning:** In V8/Bun, calling `Array.from` on an iterator (like `Map.values()`) inside a loop allocates an intermediate array and destroys performance (N^2 complexity). This pattern was found in the catalog resolver (`resolveAndPersistCatalog.ts`) and drastically slowed down matching when there were thousands of titles.
**Action:** For lookups within a loop, always maintain an auxiliary `Map` for O(1) retrieval instead of converting iterators to arrays.

## 2025-03-29 - [Optimizing Deeply Nested Movie Normalization]
**Learning:** Chained `.filter().map()` inside nested `forEach` loops (cinemas -> movies -> showings) creates severe CPU overhead due to array allocations and repeated regex operations in `normalizeMovieTitle`. The raw movie titles repeat frequently across standard/3D showings and timeslots.
**Action:** Always combine `.filter()` and `.map()` iterations into a single `for...of` loop when processing large data arrays. Use a `Map` cache for expensive, predictable string parsing tasks like title normalization within these loops to prevent redundant work. Extract `Date.now()` out of iteration paths rather than doing `.getTime()` per iteration.
