## 2025-02-17 - Added missing ARIA labels to search fields and icon buttons
**Learning:** Found multiple instances where search inputs (`<Input>`) lacked explicit `aria-label` attributes even though they had placeholder text. Additionally, icon-only utility buttons like the "Request Location" button only used `title` attributes, which are insufficient for robust screen reader support.
**Action:** Always verify that interactive icon-only buttons (`<button>`) and form inputs (`<input>`) contain an explicit `aria-label` attribute, regardless of placeholders or titles.

## 2025-04-02 - Add keyboard focus and screen reader states to custom toggle buttons
**Learning:** Found multiple instances where custom toggle buttons (like the quick date toggles and cinema filter pills) lacked explicit focus states for keyboard navigation. While they used background colors to indicate active state visually, screen readers and keyboard-only users lacked proper context and interaction cues.
**Action:** Always verify that custom interactive elements (`<button>`) without an explicit underlying form library or standard UI component have robust focus styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`) and explicitly convey their active toggle state using the `aria-pressed` attribute for screen readers.

## 2025-04-13 - Add keyboard support to custom range sliders
**Learning:** Found an instance where an `<input type="range">` used for a radius slider relied on `onMouseUp` and `onTouchEnd` to commit the value to state and cookies. While the native slider allows changing the visual value with arrow keys, lacking an `onKeyUp` handler means keyboard interactions do not trigger the commit action. Additionally, native outline resets stripped the keyboard focus indicator.
**Action:** Always verify that interactive sliders (`<input type="range">`) that commit on pointer release also have an `onKeyUp` handler to catch arrow key events, and ensure explicit focus styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`) is applied for keyboard navigation.
