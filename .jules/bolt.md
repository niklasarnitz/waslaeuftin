
## 2024-03-24 - [Avoid `Array.from(Map.values()).find(...)` in hot loops]
**Learning:** In V8/Bun, calling `Array.from` on an iterator (like `Map.values()`) inside a loop allocates an intermediate array and destroys performance (N^2 complexity). This pattern was found in the catalog resolver (`resolveAndPersistCatalog.ts`) and drastically slowed down matching when there were thousands of titles.
**Action:** For lookups within a loop, always maintain an auxiliary `Map` for O(1) retrieval instead of converting iterators to arrays.

## 2025-03-26 - [Memoize string processing in nested structures]
**Learning:** Performing multiple Regex and string operations across highly repetitive properties (like `rawMovieName` inside nested loop mapping of `cinemas -> movies -> showings`) introduces a massive N-scaling CPU bottleneck inside the Bun/Node execution process.
**Action:** When mapping over large nested arrays with many repeating property string values, introduce a memoization structure (`Map<string, T>`) for transformations (like `normalizeMovieTitle`) to execute identical operations precisely once and save up to 40x computation time.
## 2024-04-02 - LRU Caching for normalizeMovieTitle
**Learning:** Returning references to module-level cache entries without `Object.freeze` causes downstream mutation bugs, and missing max-size bounds will leak memory in the long-running script environment.
**Action:** Always freeze return values from caches and set a `MAX_CACHE_SIZE` for unbounded maps in Node/Bun.

## 2024-04-17 - Precompile Regex for Array Marker Matching
**Learning:** Iterating over an array with `.some()` and instantiating a new `RegExp` for each element inside a loop (e.g. `MARKERS.some(marker => new RegExp(marker).test(str))`) introduces massive overhead. Combining them into a single pre-compiled regex (`new RegExp(`\\b(${MARKERS.join('|')})\\b`, 'i')`) is ~10x faster in V8/Bun environments.
**Action:** Always combine static arrays of string markers into a single pre-compiled regular expression outside of loops instead of iterating and testing them individually.

## 2024-05-18 - [Replace `Array.from(Map.values()).sort()[0]` with O(N) loop]
**Learning:** Calling `Array.from()` on iterators and chaining `.sort()` to find a single top element creates intermediate arrays and forces an O(N log N) algorithmic complexity. In V8/Bun environments, maintaining a local variable inside an O(N) `for...of` loop over the iterator bypasses the GC allocation and completes significantly faster (often 5x to 10x faster).
**Action:** When searching for the "best" or "worst" candidate inside a Map or Set, always use a linear search inside a `for...of` loop instead of sorting the entire collection.
## 2024-05-18 - [Avoid `Array.from(iterator).sort(...)`]
**Learning:** In V8/Bun, calling `Array.from` on an iterator like `Map.values()` followed by `.sort(...)` just to find the single best or highest-scoring item allocates a temporary array and performs an $O(N \log N)$ sort. This causes unnecessary GC pressure and CPU overhead, especially when iterating over many TMDB candidates.
**Action:** When finding a maximum or best candidate from an iterator or map, replace `Array.from(map.values()).sort()[0]` with a single $O(N)$ `for...of` loop tracking the maximum item.
