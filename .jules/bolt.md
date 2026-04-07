
## 2024-03-24 - [Avoid `Array.from(Map.values()).find(...)` in hot loops]
**Learning:** In V8/Bun, calling `Array.from` on an iterator (like `Map.values()`) inside a loop allocates an intermediate array and destroys performance (N^2 complexity). This pattern was found in the catalog resolver (`resolveAndPersistCatalog.ts`) and drastically slowed down matching when there were thousands of titles.
**Action:** For lookups within a loop, always maintain an auxiliary `Map` for O(1) retrieval instead of converting iterators to arrays.

## 2025-03-26 - [Memoize string processing in nested structures]
**Learning:** Performing multiple Regex and string operations across highly repetitive properties (like `rawMovieName` inside nested loop mapping of `cinemas -> movies -> showings`) introduces a massive N-scaling CPU bottleneck inside the Bun/Node execution process.
**Action:** When mapping over large nested arrays with many repeating property string values, introduce a memoization structure (`Map<string, T>`) for transformations (like `normalizeMovieTitle`) to execute identical operations precisely once and save up to 40x computation time.
## 2024-04-02 - LRU Caching for normalizeMovieTitle
**Learning:** Returning references to module-level cache entries without `Object.freeze` causes downstream mutation bugs, and missing max-size bounds will leak memory in the long-running script environment.
**Action:** Always freeze return values from caches and set a `MAX_CACHE_SIZE` for unbounded maps in Node/Bun.

## 2024-04-07 - [Precompile Regex against static arrays outside loops]
**Learning:** Instantiating a new `RegExp` continuously inside `.some()` within regex replacement loops (`.replace`) across a static array (like `METADATA_MARKERS`) introduces a massive instantiation overhead.
**Action:** When performing regex operations using static arrays, always precompile a single, combined regular expression (`new RegExp(\`\\b(${ARRAY.join('|')})\\b\`, 'i')`) outside the function to bypass repeated instantiations and drastically improve string processing time.
