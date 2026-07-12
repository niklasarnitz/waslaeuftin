## 2024-05-18 - Input Focus Flow
**Learning:** In highly interactive custom combobox or search inputs that use a state-controlled clear button (`X`), failing to restore focus to the input (`inputRef.current?.focus()`) after clicking clear forces the user to manually click back into the input or use `Tab` navigation awkwardly. This disrupts the expected keyboard flow where clearing text implies a desire to retype.
**Action:** When adding clear buttons to text fields, always bind a `useRef` to the input and call `.focus()` inside the clear handler to preserve context.
