#!/usr/bin/env bash
#
# Local PRODUCTION iOS build, packaged as an unsigned .ipa for sideloading via
# AltStore / SideStore (non-EAS).
#
# AltStore re-signs the app with the user's own free Apple ID at install time,
# so we deliberately build WITHOUT code signing and zip the resulting .app into
# a Payload/ → .ipa. The backend URL is baked in at bundle time.
#
set -euo pipefail

# A Homebrew-style CPATH/LIBRARY_PATH leaks system folly/glog/fmt headers into
# the native compile and conflicts with the versions React Native ships. Strip
# them so the build only sees the expected headers.
unset CPATH CPLUS_INCLUDE_PATH C_INCLUDE_PATH OBJC_INCLUDE_PATH OBJCPLUS_INCLUDE_PATH LIBRARY_PATH

EXPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$EXPO_DIR"

# ---------------------------------------------------------------------------
# Auto-incrementing iOS build number.
#
# The committed counter in build-number.json is the source of truth. We bump it
# *before* the build (so it gets baked into the IPA's Info.plist) and revert it
# via an EXIT trap if anything fails before the build succeeds — so a failed
# build never burns a build number.
# ---------------------------------------------------------------------------
BUILD_NUMBER_FILE="$EXPO_DIR/build-number.json"
PREV_BUILD_NUMBER=""
BUILD_SUCCEEDED=0

read_build_number() {
  if [[ -f "$BUILD_NUMBER_FILE" ]]; then
    node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).ios ?? 0))" "$BUILD_NUMBER_FILE"
  else
    echo 0
  fi
}

write_build_number() {
  node -e "require('fs').writeFileSync(process.argv[1], JSON.stringify({ ios: Number(process.argv[2]) }, null, 2) + '\n')" "$BUILD_NUMBER_FILE" "$1"
}

revert_build_number() {
  if [[ "$BUILD_SUCCEEDED" -eq 0 && -n "$PREV_BUILD_NUMBER" ]]; then
    echo "✗ Build did not complete — reverting build number to $PREV_BUILD_NUMBER" >&2
    write_build_number "$PREV_BUILD_NUMBER"
  fi
}
trap revert_build_number EXIT

PREV_BUILD_NUMBER="$(read_build_number)"
BUILD_NUMBER=$((PREV_BUILD_NUMBER + 1))
write_build_number "$BUILD_NUMBER"
echo "→ iOS build number: $PREV_BUILD_NUMBER → $BUILD_NUMBER"

export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://waslaeuft.in}"
OUT_DIR="$EXPO_DIR/build-output"
mkdir -p "$OUT_DIR"

# Public origin the AltStore source + IPA are served from (same host as the API).
BASE_URL="${ALTSTORE_PUBLIC_URL:-$EXPO_PUBLIC_API_URL}"
# Committable AltStore artifacts served by the Next.js app from /public/altstore.
ALTSTORE_DIR="$EXPO_DIR/../nextjs/public/altstore"
PUBLIC_IPA_NAME="waslaeuftin.ipa"

echo "→ API URL baked into this build: $EXPO_PUBLIC_API_URL"

echo "→ Prebuilding native iOS project (Release)…"
bunx expo prebuild --platform ios --clean

WORKSPACE="$(find ios -maxdepth 1 -name "*.xcworkspace" | head -1)"
SCHEME="$(basename "$WORKSPACE" .xcworkspace)"
echo "→ Workspace: $WORKSPACE  Scheme: $SCHEME"

# Bake the auto-incremented build number into the freshly prebuilt Info.plist.
APP_INFO_PLIST="ios/$SCHEME/Info.plist"
if [[ ! -f "$APP_INFO_PLIST" ]]; then
  APP_INFO_PLIST="$(find ios -maxdepth 2 -name Info.plist -not -path "*/Pods/*" | head -1)"
fi
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$APP_INFO_PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :CFBundleVersion string $BUILD_NUMBER" "$APP_INFO_PLIST"
echo "→ Set CFBundleVersion=$BUILD_NUMBER in $APP_INFO_PLIST"

echo "→ Compiling Release build for device (code signing disabled)…"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -derivedDataPath ios/build \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  build

# Build compiled successfully — keep the incremented build number.
BUILD_SUCCEEDED=1

APP_PATH="$(find ios/build/Build/Products/Release-iphoneos -maxdepth 1 -name "*.app" | head -1)"
if [[ -z "$APP_PATH" ]]; then
  echo "✗ Could not find built .app under ios/build/Build/Products/Release-iphoneos" >&2
  exit 1
fi
echo "→ Built app: $APP_PATH"

echo "→ Packaging unsigned .ipa…"
PAYLOAD_DIR="$OUT_DIR/Payload"
rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR"
cp -R "$APP_PATH" "$PAYLOAD_DIR/"
IPA_PATH="$OUT_DIR/waslaeuftin-altstore.ipa"
rm -f "$IPA_PATH"
(cd "$OUT_DIR" && zip -qr -y "$(basename "$IPA_PATH")" Payload)
rm -rf "$PAYLOAD_DIR"

echo ""
echo "✓ Unsigned IPA ready for AltStore/SideStore:"
echo "    $IPA_PATH"

# ---------------------------------------------------------------------------
# Publish to the committable AltStore source served by Next.js (public/altstore)
# ---------------------------------------------------------------------------
echo "→ Publishing IPA + AltStore source to $ALTSTORE_DIR …"
mkdir -p "$ALTSTORE_DIR"
cp "$IPA_PATH" "$ALTSTORE_DIR/$PUBLIC_IPA_NAME"
# App icon for the store listing (overwrite each build so it stays in sync).
cp "$EXPO_DIR/assets/icon-light.png" "$ALTSTORE_DIR/icon.png"

# Pull version metadata straight from the built app's Info.plist.
PLIST="$APP_PATH/Info.plist"
plist() { /usr/libexec/PlistBuddy -c "Print :$1" "$PLIST" 2>/dev/null; }

SOURCE_OUT="$ALTSTORE_DIR/source.json" \
BASE_URL="$BASE_URL" \
IPA_NAME="$PUBLIC_IPA_NAME" \
IPA_SIZE="$(stat -f%z "$ALTSTORE_DIR/$PUBLIC_IPA_NAME")" \
APP_BUNDLE_ID="$(plist CFBundleIdentifier)" \
APP_VERSION="$(plist CFBundleShortVersionString)" \
APP_BUILD="$(plist CFBundleVersion)" \
APP_MIN_OS="$(plist MinimumOSVersion)" \
APP_DATE="$(date +%Y-%m-%d)" \
APP_CHANGELOG="${ALTSTORE_CHANGELOG:-Neuer Build.}" \
  node "$EXPO_DIR/scripts/generate-altstore-source.mjs"

echo ""
echo "✓ Committable AltStore source ready:"
echo "    $ALTSTORE_DIR/source.json"
echo "    $ALTSTORE_DIR/$PUBLIC_IPA_NAME"
echo "  Source URL (once deployed): $BASE_URL/altstore/source.json"
echo "  Install via AltStore — add that source URL, or open the IPA directly."
echo "  Commit apps/nextjs/public/altstore/ to ship the update."
