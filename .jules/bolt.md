
## 2024-03-24 - [Avoid `Array.from(Map.values()).find(...)` in hot loops]
**Learning:** In V8/Bun, calling `Array.from` on an iterator (like `Map.values()`) inside a loop allocates an intermediate array and destroys performance (N^2 complexity). This pattern was found in the catalog resolver (`resolveAndPersistCatalog.ts`) and drastically slowed down matching when there were thousands of titles.
**Action:** For lookups within a loop, always maintain an auxiliary `Map` for O(1) retrieval instead of converting iterators to arrays.

## 2024-03-24 - [Memoize expensive string parsing in deep loop iterations]
**Learning:** Functions doing extensive regex replacements, string operations, and Set manipulations (like `normalizeMovieTitle`) can create massive CPU bottlenecks when called on every item in deeply nested iterations (e.g., iterating through `cinemas -> movies -> showings`). Since there's high duplication in values (the same movie name repeats across its showings), a simple O(1) Map cache lookup provides enormous speedups (e.g., from ~1700ms down to ~3ms for 70k calls in benchmarks).
**Action:** When mapping over large nested lists (like showings) that perform complex text processing on a property with low cardinality, always inject a `Map` cache outside the iteration loops.
