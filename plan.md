1. **Fix Keyboard Accessibility for Radius Slider**: Add `onKeyUp` handler to the `<input type="range">` in `src/components/NearbyCinemasSection.tsx` so that keyboard users (who use arrow keys) can trigger the `handleRadiusRelease` commit action.
2. **Add Focus Styles for Range Input & Action Buttons**: Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` to the radius slider input and the "Standort erneut abfragen" icon button to ensure clear keyboard focus indicators.
3. **Verify UI/Accessibility Improvements**: Run formatting/linting scripts (`bun lint`) to ensure the changes are valid, and manually verify the diff.
4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
5. **Create the Pull Request**: Submit the change with "🎨 Palette: [UX improvement]" title and specific UX problem details in the description.
