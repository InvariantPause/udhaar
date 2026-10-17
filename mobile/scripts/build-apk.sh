#!/usr/bin/env bash
# Builds the Android debug APK (the phone's dev build) without a connected
# device. First run also generates android/ via prebuild.
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

(cd android && ./gradlew :app:assembleDebug --console=plain)

echo
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
echo "Install on the phone once:  npx expo start on this Mac, then serve the APK:"
echo "  python3 -m http.server 8033 --directory android/app/build/outputs/apk/debug"
echo "  open http://<mac-ip>:8033/app-debug.apk on the phone"
