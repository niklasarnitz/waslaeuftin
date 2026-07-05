## 2026-07-05 - Input Focus Management on Clear
**Learning:** When a clear button inside an input field is clicked and unmounted, focus is lost, leading to poor keyboard accessibility.
**Action:** Always use a React `useRef` to programmatically restore focus to the input field after the value is cleared.
