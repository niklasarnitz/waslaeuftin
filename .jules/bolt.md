## 2026-07-18 - [O(N^2) indexOf in React render loop]
**Learning:** In React render loops, avoid calling `Array.indexOf()` within a `.map()` over concatenated arrays, as it creates an O(N^2) bottleneck.
**Action:** Calculate the flat index in O(1) time directly from the map's index and the preceding array's length.
