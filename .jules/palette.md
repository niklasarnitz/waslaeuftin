## 2025-02-17 - Added missing ARIA labels to search fields and icon buttons
**Learning:** Found multiple instances where search inputs (`<Input>`) lacked explicit `aria-label` attributes even though they had placeholder text. Additionally, icon-only utility buttons like the "Request Location" button only used `title` attributes, which are insufficient for robust screen reader support.
**Action:** Always verify that interactive icon-only buttons (`<button>`) and form inputs (`<input>`) contain an explicit `aria-label` attribute, regardless of placeholders or titles.

## 2025-04-02 - Add keyboard focus and screen reader states to custom toggle buttons
**Learning:** Found multiple instances where custom toggle buttons (like the quick date toggles and cinema filter pills) lacked explicit focus states for keyboard navigation. While they used background colors to indicate active state visually, screen readers and keyboard-only users lacked proper context and interaction cues.
**Action:** Always verify that custom interactive elements (`<button>`) without an explicit underlying form library or standard UI component have robust focus styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`) and explicitly convey their active toggle state using the `aria-pressed` attribute for screen readers.

## 2025-04-16 - Add robust aria-labels and decorative icons in `ShowingTimePill`
**Learning:** Found that time pill links only announced the raw clock time to screen readers (e.g., "14:30") and had no focus styling when navigating via keyboard. Additionally, the decorative `Clock3` icon lacked `aria-hidden="true"`, leading to potential double or messy announcements.
**Action:** When creating semantic links that rely on visual context (like a time pill underneath a movie title), ensure you build a comprehensive `aria-label` (e.g., "Tickets für [Movie] um [Time] Uhr buchen") and hide decorative icons using `aria-hidden="true"`. Also always verify focus states as global resets can strip them.

## 2025-04-20 - Use visual loading indicators for async auto-complete search fields
**Learning:** Found that the main `CommandSearch` auto-complete component lacked any visual loading state while fetching tRPC queries. During network latency, users would have no feedback that their typing was being processed, which can lead to redundant key presses or confusion. Furthermore, decorative icons (`Search`, `MapPin`, `Building2`) inside the dialog list items lacked `aria-hidden="true"`, creating redundant screen-reader announcements.
**Action:** Always conditionally render a spinner (e.g., `lucide-react`'s `Loader2` with `animate-spin`) in place of standard icons (like the `Search` icon) based on the `isFetching` or `isLoading` properties of async queries to provide immediate feedback. Also explicitly add `aria-hidden="true"` to any decorative icons inside lists or buttons to ensure clean screen reader UX.
