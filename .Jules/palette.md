## 2026-04-01 - Missing aria-pressed and focus styles on custom toggle buttons
**Learning:** Custom toggle buttons (like quick date selection) often lack proper `aria-pressed` states and distinct keyboard focus indicators compared to native inputs.
**Action:** Always verify that elements acting as toggles convey their active state to screen readers via `aria-pressed` and include `focus-visible:ring-2` for keyboard navigation.
