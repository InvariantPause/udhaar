#!/usr/bin/env bash
# Builds the standalone release APK (embedded Hermes bundle — the phone needs
# no Metro) and copies it to release/ for sharing.
#
# Signed with the debug keystore (the RN template default), so it installs
# over the dev build in place: same signature, existing data is kept.
# Play Store distribution would need a real upload keystore; do that only
# before real users exist, and export a backup first (new signature = reinstall).
#
# Toolchain (brew, no accounts): openjdk@17 + android-commandlinetools.
# Override JAVA_HOME / ANDROID_HOME in the environment if yours differ.
set -euo pipefail

cd "$(dirname "$0")/.."

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"

if [ ! -f "$JAVA_HOME/bin/java" ]; then
  echo "JAVA_HOME does not point at a JDK: $JAVA_HOME" >&2
  exit 1
fi
if [ ! -d "$ANDROID_HOME" ]; then
  echo "ANDROID_HOME does not point at an SDK: $ANDROID_HOME" >&2
  exit 1
fi

if [ ! -d android ]; then
  npx expo prebuild --platform android --no-install
fi

printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties

(cd android && ./gradlew :app:assembleRelease --console=plain)

VERSION="$(node -p "require('./package.json').version")"
OUT="release/udhaar-$VERSION.apk"
mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk "$OUT"

echo
echo "APK: $OUT ($(du -h "$OUT" | cut -f1 | tr -d ' '))"
echo "Serve for the phone:"
echo "  python3 -m http.server 8033 --directory release"
echo "  open http://<mac-ip>:8033/udhaar-$VERSION.apk on the phone"
