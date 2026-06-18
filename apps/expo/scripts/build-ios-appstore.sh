#!/usr/bin/env bash
#
# Build a PRODUCTION iOS release LOCALLY (on this Mac) and ship it to App Store
# Connect (TestFlight / App Store) via EAS.
#
# Unlike build-ios-altstore.sh (which produces an UNSIGNED .ipa for sideloading),
# the App Store requires a properly code-signed build. `eas build --local` runs
# the same build pipeline as the EAS cloud — including pulling the distribution
# certificate + provisioning profile EAS manages for us — but on this machine,
# so we don't spend cloud build credits.
#
# Version + build number come from EAS remote state (eas.json:
# cli.appVersionSource = "remote"), so the build number auto-increments on the
# server — no local counter to keep in sync.
#
# Usage:
#   bun run build:ios:appstore             # local build, then submit to ASC
#   NO_SUBMIT=1 bun run build:ios:appstore # local build only, don't submit
#
# Auth: the first run is interactive so EAS can handle Apple sign-in / 2FA and
# set up credentials. For non-interactive/CI runs, configure an App Store
# Connect API key under submit.production in eas.json (ascApiKeyPath, ascApiKeyId,
# ascApiKeyIssuerId), set EXPO_TOKEN, and pass NON_INTERACTIVE=1.
set -euo pipefail

EXPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$EXPO_DIR"

PROFILE="${PROFILE:-production}"
OUT_DIR="$EXPO_DIR/build-output"
IPA_PATH="$OUT_DIR/waslaeuftin-appstore.ipa"

if ! command -v eas >/dev/null 2>&1; then
  echo "✗ eas CLI not found. Install it with: npm i -g eas-cli" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$IPA_PATH"

echo "→ EAS CLI: $(eas --version)"
echo "→ Build profile: $PROFILE"
echo "→ Building locally on this Mac (eas build --local)…"

BUILD_ARGS=(build --platform ios --profile "$PROFILE" --local --output "$IPA_PATH")
if [[ "${NON_INTERACTIVE:-0}" == "1" ]]; then
  BUILD_ARGS+=(--non-interactive)
fi

eas "${BUILD_ARGS[@]}"

if [[ ! -f "$IPA_PATH" ]]; then
  echo "✗ Expected build artifact not found at $IPA_PATH" >&2
  exit 1
fi
echo "→ Built signed IPA: $IPA_PATH"

if [[ "${NO_SUBMIT:-0}" == "1" ]]; then
  echo ""
  echo "✓ Local build finished (submit skipped, NO_SUBMIT=1)."
  echo "  To submit it later:"
  echo "    eas submit --platform ios --profile $PROFILE --path \"$IPA_PATH\""
  exit 0
fi

echo "→ Submitting to App Store Connect…"
SUBMIT_ARGS=(submit --platform ios --profile "$PROFILE" --path "$IPA_PATH")
if [[ "${NON_INTERACTIVE:-0}" == "1" ]]; then
  SUBMIT_ARGS+=(--non-interactive)
fi

eas "${SUBMIT_ARGS[@]}"

echo ""
echo "✓ Build submitted to App Store Connect."
echo "  It will appear under TestFlight once Apple finishes processing (a few min–1h)."
echo "  Check status: https://appstoreconnect.apple.com → your app → TestFlight."
