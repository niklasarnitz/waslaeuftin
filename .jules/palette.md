## 2025-02-17 - Added missing ARIA labels to search fields and icon buttons
**Learning:** Found multiple instances where search inputs (`<Input>`) lacked explicit `aria-label` attributes even though they had placeholder text. Additionally, icon-only utility buttons like the "Request Location" button only used `title` attributes, which are insufficient for robust screen reader support.
**Action:** Always verify that interactive icon-only buttons (`<button>`) and form inputs (`<input>`) contain an explicit `aria-label` attribute, regardless of placeholders or titles.

## 2025-04-02 - Add keyboard focus and screen reader states to custom toggle buttons
**Learning:** Found multiple instances where custom toggle buttons (like the quick date toggles and cinema filter pills) lacked explicit focus states for keyboard navigation. While they used background colors to indicate active state visually, screen readers and keyboard-only users lacked proper context and interaction cues.
**Action:** Always verify that custom interactive elements (`<button>`) without an explicit underlying form library or standard UI component have robust focus styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`) and explicitly convey their active toggle state using the `aria-pressed` attribute for screen readers.

## 2025-04-16 - Add robust aria-labels and decorative icons in `ShowingTimePill`
**Learning:** Found that time pill links only announced the raw clock time to screen readers (e.g., "14:30") and had no focus styling when navigating via keyboard. Additionally, the decorative `Clock3` icon lacked `aria-hidden="true"`, leading to potential double or messy announcements.
**Action:** When creating semantic links that rely on visual context (like a time pill underneath a movie title), ensure you build a comprehensive `aria-label` (e.g., "Tickets für [Movie] um [Time] Uhr buchen") and hide decorative icons using `aria-hidden="true"`. Also always verify focus states as global resets can strip them.

## 2025-05-24 - Implement ARIA combobox pattern in custom command menus
**Learning:** Custom command menus (like CommandSearch) often rely entirely on React state (`activeIndex`) and custom keydown listeners (`ArrowDown`/`ArrowUp`) for navigation, while native screen reader announcements lag behind. Additionally, default focus rings on trigger buttons can be stripped by Tailwind resets.
**Action:** When building custom search dialogs, fully implement the ARIA combobox pattern on the input (`role="combobox"`, `aria-controls`, `aria-activedescendant`) and list (`role="listbox"`, `role="option"`, `aria-selected`). Sync custom arrow-key navigation with native Tab focus by adding `onFocus={() => setActiveIndex(flatIndex)}` to the options, and ensure the trigger button has explicit `focus-visible` styling.
