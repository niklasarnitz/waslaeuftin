#!/usr/bin/env bash
#
# Build a PRODUCTION Android release LOCALLY as a signed Android App Bundle
# (.aab) for MANUAL upload to the Google Play Console.
#
# Unlike build-android-apk.sh (which produces a standalone .apk for the direct
# website download / sideloading), the Play Store requires an .aab. `eas build
# --local` runs the same build pipeline as the EAS cloud — including signing with
# the release keystore EAS manages — but on this machine, so we don't spend cloud
# build credits. The resulting bundle is left in build-output/ for you to upload
# by hand in the Play Console (Production / testing track → Create release).
#
# Version + version code come from EAS remote state (eas.json:
# cli.appVersionSource = "remote"), so the version code auto-increments on the
# server — no local counter to keep in sync.
#
# Usage:
#   bun run build:android:playstore
#
set -euo pipefail

EXPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$EXPO_DIR"

PROFILE="${PROFILE:-production}"
OUT_DIR="$EXPO_DIR/build-output"
AAB_PATH="$OUT_DIR/waslaeuftin-playstore.aab"

if ! command -v eas >/dev/null 2>&1; then
  echo "✗ eas CLI not found. Install it with: npm i -g eas-cli" >&2
  exit 1
fi

if [[ -z "${JAVA_HOME:-}" && -x "$HOME/.cache/amp-tools/jdk-21/bin/java" ]]; then
  export JAVA_HOME="$HOME/.cache/amp-tools/jdk-21"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/.cache/amp-tools/android-sdk}}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

mkdir -p "$OUT_DIR"
rm -f "$AAB_PATH"

echo "→ EAS CLI: $(eas --version)"
echo "→ Build profile: $PROFILE"
echo "→ JAVA_HOME: ${JAVA_HOME:-(not set, using system default)}"
echo "→ ANDROID_HOME: $ANDROID_HOME"
echo "→ Building locally on this machine (eas build --local)…"

BUILD_ARGS=(build --platform android --profile "$PROFILE" --local --output "$AAB_PATH")
if [[ "${NON_INTERACTIVE:-0}" == "1" ]]; then
  BUILD_ARGS+=(--non-interactive)
fi

eas "${BUILD_ARGS[@]}"

if [[ ! -f "$AAB_PATH" ]]; then
  echo "✗ Expected build artifact not found at $AAB_PATH" >&2
  exit 1
fi

echo ""
echo "✓ Release-signed AAB ready for manual upload:"
echo "    $AAB_PATH"
echo "  Upload it in the Play Console → your app → Production (or a testing track)"
echo "  → Create release → upload this .aab."
