## 2024-04-13 - [Performance] Regex compilation inside loop
**Learning:** Instantiating `new RegExp()` inside an Array `.some()` loop that executes frequently (like during title normalization for every title) causes massive CPU overhead.
**Action:** Always precompile static marker arrays into a single combined regular expression using `new RegExp("...join('|')", "i")` outside of the execution path to optimize string checking operations.
