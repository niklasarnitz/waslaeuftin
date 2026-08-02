## 2024-08-02 - Focus Management on Clear Actions
**Learning:** When users click a "clear" button inside a search or text input, native browser behavior causes focus to shift to the button, and then be lost entirely when the button is removed from the DOM. This forces keyboard and screen reader users to manually navigate back to the input to type a new query.
**Action:** Always use `useRef` to target the underlying `<input>` element and explicitly call `.focus()` after the clear action completes to maintain a seamless, uninterrupted typing experience.
