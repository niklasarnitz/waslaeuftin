## 2025-02-17 - Added missing ARIA labels to search fields and icon buttons
**Learning:** Found multiple instances where search inputs (`<Input>`) lacked explicit `aria-label` attributes even though they had placeholder text. Additionally, icon-only utility buttons like the "Request Location" button only used `title` attributes, which are insufficient for robust screen reader support.
**Action:** Always verify that interactive icon-only buttons (`<button>`) and form inputs (`<input>`) contain an explicit `aria-label` attribute, regardless of placeholders or titles.

## 2025-04-02 - Add keyboard focus and screen reader states to custom toggle buttons
**Learning:** Found multiple instances where custom toggle buttons (like the quick date toggles and cinema filter pills) lacked explicit focus states for keyboard navigation. While they used background colors to indicate active state visually, screen readers and keyboard-only users lacked proper context and interaction cues.
**Action:** Always verify that custom interactive elements (`<button>`) without an explicit underlying form library or standard UI component have robust focus styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`) and explicitly convey their active toggle state using the `aria-pressed` attribute for screen readers.

## 2025-04-09 - Range Slider Keyboard Accessibility
**Learning:** Range sliders (`<input type="range">`) often rely on `onMouseUp` or `onTouchEnd` to trigger data fetches (like radius search). However, keyboard users navigating with arrow keys cannot trigger these events, leaving them unable to commit the selection. Also, standard outline resets often hide focus rings on custom sliders.
**Action:** When implementing range inputs that commit state on interaction end, ensure an `onKeyUp` handler is also implemented to catch keyboard adjustments. Always explicitly apply `focus-visible` styling to custom range inputs.
