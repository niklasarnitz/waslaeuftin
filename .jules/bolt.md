## 2024-05-18 - [React Render Loop O(N^2) Optimization]
**Learning:** In React render loops, using `Array.indexOf()` within a `.map()` over concatenated arrays creates an O(N^2) bottleneck. The memory states that we should calculate the flat index directly from the map's index and the preceding array's length.
**Action:** Replace `indexOf` in `.map()` with O(1) mathematical index calculation when mapping over subset arrays.
