## 2025-02-17 - Added missing ARIA labels to search fields and icon buttons
**Learning:** Found multiple instances where search inputs (`<Input>`) lacked explicit `aria-label` attributes even though they had placeholder text. Additionally, icon-only utility buttons like the "Request Location" button only used `title` attributes, which are insufficient for robust screen reader support.
**Action:** Always verify that interactive icon-only buttons (`<button>`) and form inputs (`<input>`) contain an explicit `aria-label` attribute, regardless of placeholders or titles.

## 2025-04-02 - Add keyboard focus and screen reader states to custom toggle buttons
**Learning:** Found multiple instances where custom toggle buttons (like the quick date toggles and cinema filter pills) lacked explicit focus states for keyboard navigation. While they used background colors to indicate active state visually, screen readers and keyboard-only users lacked proper context and interaction cues.
**Action:** Always verify that custom interactive elements (`<button>`) without an explicit underlying form library or standard UI component have robust focus styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`) and explicitly convey their active toggle state using the `aria-pressed` attribute for screen readers.

## 2025-04-14 - Screen reader context for isolated visual elements like Showing Pills
**Learning:** Time pills (`<ShowingTimePill>`) displaying only a formatted time string (e.g., "14:30") lacked surrounding context. A screen reader reading simply "14:30" is confusing without knowing what happens at 14:30.
**Action:** When creating visual "pill" buttons or links that rely on their visual context (like being nested under a movie name), always wrap the bare text with visually hidden `sr-only` context (e.g., `<span className="sr-only">Tickets für {movieName} um </span>14:30<span className="sr-only"> Uhr buchen</span>`) to make the resulting interaction clear to assistive technologies without overriding other nested children (like `ShowingTags`).
