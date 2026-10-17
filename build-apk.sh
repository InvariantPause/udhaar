#!/usr/bin/env bash
# ============================================================================
#  build-apk.sh — rebuild the Udhaar Android APK from the HTML
# ============================================================================
#  Usage:  ./build-apk.sh
#
#  What it does:
#    1. Copies the latest mobile.html into app/www/index.html
#    2. Rewrites CDN <link>/<script> tags to the locally-vendored copies
#       (so the app works fully offline)
#    3. Syncs Capacitor and builds a debug APK
#
#  Output:  app/android/app/build/outputs/apk/debug/app-debug.apk
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/app"
WWW="$APP/www"

# --- toolchain (Homebrew JDK 17 + installed Android command-line tools) ------
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

echo "▶ JAVA_HOME   = $JAVA_HOME"
echo "▶ ANDROID_HOME= $ANDROID_HOME"

# --- 1. copy the latest app HTML --------------------------------------------
if [ -f "$ROOT/mobile.html" ]; then
  cp "$ROOT/mobile.html" "$WWW/index.html"
  echo "▶ copied mobile.html -> app/www/index.html"
fi

# --- 2. make it offline: point CDN refs at local vendor/ + fonts/ -----------
python3 - "$WWW/index.html" <<'PY'
import sys, re, pathlib
p = pathlib.Path(sys.argv[1])
html = p.read_text()

# 1) Point the Inter stylesheet at the vendored copy FIRST
html = re.sub(
    r'<link[^>]*family=Inter[^>]*>',
    '<link rel="stylesheet" href="fonts/inter-local.css">',
    html,
)
# 2) Drop the preconnect hints (no longer needed offline)
html = re.sub(r'<link[^>]*rel="preconnect"[^>]*>\s*', '', html)
# 3) Swap the Chart.js CDN script for the vendored file
html = re.sub(
    r'<script[^>]*cdn\.jsdelivr\.net[^>]*>.*?</script>',
    '<script src="vendor/chart.umd.min.js"></script>',
    html,
    flags=re.S,
)
p.write_text(html)
print("▶ rewrote CDN refs -> local assets")
PY

# --- 3. build ---------------------------------------------------------------
cd "$APP"
echo "▶ syncing capacitor…"
npx cap sync android

echo "▶ building debug APK…"
cd android
./gradlew assembleDebug

APK="$APP/android/app/build/outputs/apk/debug/app-debug.apk"
echo
echo "✅ APK ready: $APK"

# copy to project root for easy access
cp "$APK" "$ROOT/udhaar.apk"
echo "📦 copied to:  $ROOT/udhaar.apk"

echo "   Install on a device:   adb install -r \"$APK\""
echo "   Install on the AVD:    $ANDROID_HOME/platform-tools/adb install -r \"$APK\""
