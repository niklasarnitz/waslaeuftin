#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SCHEME="${SCHEME:-WasLaeuftIn}"
CONFIGURATION="${CONFIGURATION:-Release}"
PROJECT_PATH="${PROJECT_PATH:-$IOS_DIR/WasLaeuftIn.xcodeproj}"
TEAM_ID="${TEAM_ID:-${1:-}}"

TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
BUILD_DIR="${BUILD_DIR:-$IOS_DIR/build}"
ARCHIVE_PATH="${ARCHIVE_PATH:-$BUILD_DIR/${SCHEME}-${TIMESTAMP}.xcarchive}"
EXPORT_DIR="${EXPORT_DIR:-$BUILD_DIR/ipa-${TIMESTAMP}}"
EXPORT_OPTIONS_PLIST="${EXPORT_OPTIONS_PLIST:-}"

TEMP_EXPORT_OPTIONS=""

cleanup() {
  if [[ -n "$TEMP_EXPORT_OPTIONS" && -f "$TEMP_EXPORT_OPTIONS" ]]; then
    rm -f "$TEMP_EXPORT_OPTIONS"
  fi
}
trap cleanup EXIT

fail() {
  echo "Error: $*" >&2
  exit 1
}

if ! command -v xcodebuild >/dev/null 2>&1; then
  fail "xcodebuild not found. Please install Xcode and command line tools."
fi

if [[ -z "$EXPORT_OPTIONS_PLIST" ]]; then
  if [[ -n "$TEAM_ID" ]]; then
    TEAM_EXPORT_PLIST="$IOS_DIR/ExportOptions-${TEAM_ID}.plist"
    if [[ -f "$TEAM_EXPORT_PLIST" ]]; then
      EXPORT_OPTIONS_PLIST="$TEAM_EXPORT_PLIST"
      echo "Using export options: $EXPORT_OPTIONS_PLIST"
    else
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
    fail "TEAM_ID is required unless EXPORT_OPTIONS_PLIST is provided. Example: TEAM_ID=5NP472TPJA bash ios/scripts/build-ipa-7day.sh"
  fi
fi

mkdir -p "$BUILD_DIR" "$EXPORT_DIR"

echo "Archiving iOS app..."
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

echo "Build complete."
echo "IPA: $IPA_PATH"
echo "Archive: $ARCHIVE_PATH"
echo "Note: Development-signed IPAs on free Apple accounts usually expire after 7 days."
