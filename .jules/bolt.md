## 2026-06-13 - Replace O(N) indexOf with O(1) index calculation
**Learning:** In React components that render concatenated lists (e.g. `[...cities, ...cinemas]`), computing a global `activeIndex` for keyboard navigation by calling `.indexOf()` on the concatenated array from inside each sub-array's `.map()` loop creates a silent (N^2)$ performance bottleneck during render.
**Action:** Compute the flat index in (1)$ time by passing the map index directly for the first array, and adding the length of the first array to the map index for the second array.
