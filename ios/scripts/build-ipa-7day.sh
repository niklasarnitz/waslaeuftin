#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$IOS_DIR/.." && pwd)"

SCHEME="${SCHEME:-WasLaeuftIn}"
CONFIGURATION="${CONFIGURATION:-Release}"
PROJECT_PATH="${PROJECT_PATH:-$IOS_DIR/WasLaeuftIn.xcodeproj}"
TEAM_ID="${TEAM_ID:-${1:-}}"

BUILD_DIR="${BUILD_DIR:-$IOS_DIR/build}"
EXPORT_OPTIONS_PLIST="${EXPORT_OPTIONS_PLIST:-}"

TEMP_EXPORT_OPTIONS=""
TEMP_DIR=""

cleanup() {
  if [[ -n "$TEMP_EXPORT_OPTIONS" && -f "$TEMP_EXPORT_OPTIONS" ]]; then
    rm -f "$TEMP_EXPORT_OPTIONS"
  fi
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

fail() {
  echo "Error: $*" >&2
  exit 1
}

detect_team_id() {
  local detected
  detected="$(xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -showBuildSettings 2>/dev/null | awk -F ' = ' '/DEVELOPMENT_TEAM = / {print $2; exit}')"

  echo "$detected"
}

# ── Bump minor version in Info.plist ──────────────────────────────
INFO_PLIST="$IOS_DIR/WasLaeuftIn/Info.plist"
if [[ ! -f "$INFO_PLIST" ]]; then
  fail "Info.plist not found at $INFO_PLIST"
fi

CURRENT_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$INFO_PLIST")"
MAJOR="${CURRENT_VERSION%%.*}"
MINOR="${CURRENT_VERSION#*.}"
NEW_MINOR=$(( MINOR + 1 ))
NEW_VERSION="${MAJOR}.${NEW_MINOR}"

echo "Bumping version: $CURRENT_VERSION → $NEW_VERSION"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $NEW_VERSION" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_MINOR" "$INFO_PLIST"

# ── Detect toolchain ─────────────────────────────────────────────
if ! command -v xcodebuild >/dev/null 2>&1; then
  fail "xcodebuild not found. Please install Xcode and command line tools."
fi

if [[ -z "$TEAM_ID" ]]; then
  TEAM_ID="$(detect_team_id)"
  if [[ -n "$TEAM_ID" ]]; then
    echo "Detected Xcode team: $TEAM_ID"
  fi
fi

# ── Resolve / generate ExportOptions plist ───────────────────────
if [[ -z "$EXPORT_OPTIONS_PLIST" ]]; then
  if [[ -n "$TEAM_ID" ]]; then
    TEAM_EXPORT_PLIST="$IOS_DIR/ExportOptions-${TEAM_ID}.plist"
    if [[ -f "$TEAM_EXPORT_PLIST" ]]; then
      EXPORT_OPTIONS_PLIST="$TEAM_EXPORT_PLIST"
      echo "Using export options: $EXPORT_OPTIONS_PLIST"
    else
      TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
      TEMP_EXPORT_OPTIONS="$BUILD_DIR/ExportOptions-${TEAM_ID}-${TIMESTAMP}.plist"
      mkdir -p "$BUILD_DIR"
      cat >"$TEMP_EXPORT_OPTIONS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>development</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>${TEAM_ID}</string>
  <key>compileBitcode</key>
  <false/>
  <key>destination</key>
  <string>export</string>
</dict>
</plist>
EOF
      EXPORT_OPTIONS_PLIST="$TEMP_EXPORT_OPTIONS"
      echo "Generated export options: $EXPORT_OPTIONS_PLIST"
    fi
  else
    fail "Could not determine DEVELOPMENT_TEAM from Xcode settings. Select a team in Xcode Signing settings, or pass TEAM_ID / EXPORT_OPTIONS_PLIST explicitly."
  fi
fi

TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
ARCHIVE_PATH="${ARCHIVE_PATH:-$BUILD_DIR/${SCHEME}-${TIMESTAMP}.xcarchive}"
EXPORT_DIR="${EXPORT_DIR:-$BUILD_DIR/ipa-${TIMESTAMP}}"

mkdir -p "$BUILD_DIR" "$EXPORT_DIR"

echo "Archiving iOS app (v${NEW_VERSION})..."
archive_args=(
  -project "$PROJECT_PATH"
  -scheme "$SCHEME"
  -configuration "$CONFIGURATION"
  -destination "generic/platform=iOS"
  -archivePath "$ARCHIVE_PATH"
  clean
  archive
  CODE_SIGN_STYLE=Automatic
  -allowProvisioningUpdates
)

if [[ -n "$TEAM_ID" ]]; then
  archive_args+=(DEVELOPMENT_TEAM="$TEAM_ID")
fi

xcodebuild "${archive_args[@]}"

echo "Exporting IPA..."
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  -allowProvisioningUpdates

IPA_PATH="$(find "$EXPORT_DIR" -maxdepth 1 -type f -name "*.ipa" -print -quit)"

if [[ -z "$IPA_PATH" ]]; then
  fail "Export finished, but no IPA was found in $EXPORT_DIR"
fi

# ── Strip signing for AltStore compatibility ─────────────────────
# AltStore needs to fully re-sign the IPA with its own provisioning
# profile. We remove the existing code signature and provisioning
# profile so AltStore can do a clean re-sign (similar to how
# Amethyst-iOS ships unsigned IPAs via ldid).
echo "Stripping code signature for AltStore compatibility..."

TEMP_DIR="$(mktemp -d)"
UNZIP_DIR="$TEMP_DIR/unzipped"
mkdir -p "$UNZIP_DIR"
unzip -q "$IPA_PATH" -d "$UNZIP_DIR"

APP_BUNDLE="$(find "$UNZIP_DIR/Payload" -maxdepth 1 -name "*.app" -print -quit)"
if [[ -z "$APP_BUNDLE" ]]; then
  fail "Could not find .app bundle inside IPA"
fi

# Remove existing code signature and provisioning profile
rm -rf "$APP_BUNDLE/_CodeSignature"
rm -f "$APP_BUNDLE/embedded.mobileprovision"

# Strip get-task-allow entitlement (marks app as debuggable)
ENTITLEMENTS_PLIST="$TEMP_DIR/entitlements.plist"
codesign -d --entitlements - --xml "$APP_BUNDLE" > "$ENTITLEMENTS_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Delete :get-task-allow" "$ENTITLEMENTS_PLIST" 2>/dev/null || true

# Ad-hoc sign (no identity) with cleaned entitlements so AltStore
# can freely re-sign with its own certificate
codesign --force --sign - --entitlements "$ENTITLEMENTS_PLIST" "$APP_BUNDLE"

# Re-package the IPA
STRIPPED_IPA="$TEMP_DIR/stripped.ipa"
(cd "$UNZIP_DIR" && zip -qr "$STRIPPED_IPA" Payload)

# Replace the original IPA
cp "$STRIPPED_IPA" "$IPA_PATH"
echo "Code signature stripped for AltStore."

echo "Build complete."
echo "IPA: $IPA_PATH"
echo "Archive: $ARCHIVE_PATH"

# ── Publish IPA ──────────────────────────────────────────────────
APP_PATH="$ARCHIVE_PATH/Products/Applications/${SCHEME}.app"
APP_BUNDLE_ID=""
if [[ -f "$APP_PATH/Info.plist" ]]; then
  APP_BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_PATH/Info.plist" 2>/dev/null || true)"
fi

if [[ -z "$APP_BUNDLE_ID" ]]; then
  APP_BUNDLE_ID="$(awk -F'= ' '/PRODUCT_BUNDLE_IDENTIFIER = /{gsub(/;|\\n/,"",$2); print $2; exit}' "$IOS_DIR/WasLaeuftIn.xcodeproj/project.pbxproj" || true)"
fi

if command -v node >/dev/null 2>&1; then
  PUBLISH_SCRIPT="$REPO_ROOT/scripts/publish-ipa.cjs"
  if [[ -f "$PUBLISH_SCRIPT" ]]; then
    echo "Publishing IPA to public/app/$NEW_VERSION and updating altstore.json..."
    node "$PUBLISH_SCRIPT" "$IPA_PATH" "$APP_BUNDLE_ID" "$NEW_VERSION" || echo "Publish script failed"
  else
    echo "Publish script not found: $PUBLISH_SCRIPT"
  fi
else
  echo "Node not found; skipping publish step."
fi
