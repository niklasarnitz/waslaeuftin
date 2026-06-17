#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ -z "${JAVA_HOME:-}" && -x "$HOME/.cache/amp-tools/jdk-21/bin/java" ]]; then
  export JAVA_HOME="$HOME/.cache/amp-tools/jdk-21"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/.cache/amp-tools/android-sdk}}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

if [[ ! -d "$ANDROID_HOME" ]]; then
  echo "Android SDK not found at $ANDROID_HOME." >&2
  echo "Install Android Studio/SDK or set ANDROID_HOME to your SDK path." >&2
  exit 1
fi

echo "--- Build Environment ---"
echo "JAVA_HOME: ${JAVA_HOME:-(not set, using system default)}"
if command -v java >/dev/null 2>&1; then
  echo "Java version:"
  java -version 2>&1 | sed 's/^/  /'
else
  echo "Java: not found on PATH"
fi
echo "ANDROID_HOME: $ANDROID_HOME"
echo "-------------------------"

rm -rf dist/waslaeuftin.apk

bunx expo prebuild --platform android --clean --no-install

pushd android >/dev/null
./gradlew assembleRelease
popd >/dev/null

mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk dist/waslaeuftin.apk

echo "APK created at apps/expo/dist/waslaeuftin.apk"

# ---------------------------------------------------------------------------
# Publish the APK to the Next.js public dir so it can be committed and served
# as a direct download from the website (https://waslaeuft.in/waslaeuftin.apk).
# ---------------------------------------------------------------------------
NEXTJS_PUBLIC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../nextjs/public" && pwd)"
cp dist/waslaeuftin.apk "$NEXTJS_PUBLIC_DIR/waslaeuftin.apk"
echo "APK published to apps/nextjs/public/waslaeuftin.apk"
echo "Commit apps/nextjs/public/waslaeuftin.apk to ship the Android download."
