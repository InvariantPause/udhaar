# Udhaar — Android App (APK)

`mobile.html` wrapped into a real, installable Android app with
[Capacitor](https://capacitorjs.com). The web UI is bundled **inside** the APK,
so the app works fully offline and launches instantly.

```
udhaar/
├── mobile.html            ← the app (single file, source of truth)
├── build-apk.sh           ← one command to rebuild the APK
└── app/
    ├── capacitor.config.json
    ├── package.json
    ├── www/               ← web assets that get bundled into the APK
    │   ├── index.html     ← copy of mobile.html (offline-patched)
    │   ├── vendor/chart.umd.min.js   ← Chart.js, vendored (no CDN)
    │   └── fonts/         ← Inter woff2, vendored (no CDN)
    └── android/           ← the native Android project (Gradle)
```

## Rebuild the APK

```bash
./build-apk.sh
```

That copies `mobile.html` → `app/www/index.html`, swaps the CDN references for
the local `vendor/` + `fonts/` copies, syncs Capacitor, and runs Gradle.

**Output:**

```
app/android/app/build/outputs/apk/debug/app-debug.apk
```

## Install it

On a **physical phone** (USB debugging on, `adb` installed):

```bash
adb install -r app/android/app/build/outputs/apk/debug/app-debug.apk
```

On the **`udhaar` emulator** that already exists on this machine:

```bash
# start the emulator
/opt/homebrew/share/android-commandlinetools/emulator/emulator -avd udhaar &

# wait for it to boot, then:
/opt/homebrew/share/android-commandlinetools/platform-tools/adb install -r \
  app/android/app/build/outputs/apk/debug/app-debug.apk
```

Then look for the **Udhaar** app icon.

## Toolchain on this machine

Everything needed is already installed:

| Tool | Path |
|---|---|
| JDK 17 | `/opt/homebrew/opt/openjdk@17` |
| Android SDK | `/opt/homebrew/share/android-commandlinetools` (android-35/36) |
| adb | `$ANDROID_HOME/platform-tools/adb` |
| Emulator + AVD `udhaar` | Pixel 7, Android 36, arm64 |

`build-apk.sh` sets `JAVA_HOME` / `ANDROID_HOME` for you.

The system `java` (Oracle 8) is **not** used — the build needs JDK 17, which
Homebrew provides.

## Config

`app/capacitor.config.json`:

```json
{
  "appId": "com.udhaar.app",
  "appName": "Udhaar",
  "webDir": "www"
}
```

Rename the app, change the package id, or bump `versionCode` / `versionName`
in `app/android/app/build.gradle`.

## Icons & splash

The default Capacitor icon is used for now. To brand it, drop a
`1024×1024` PNG at `app/resources/icon.png` and a splash at
`app/resources/splash.png`, then:

```bash
cd app
npm i -D @capacitor/assets
npx capacitor-assets generate --android
```

## Release (signed) APK — later

Debug builds are fine for personal sideloading. For a Play Store release:

```bash
cd app/android
./gradlew assembleRelease        # needs a keystore configured
```

Create a keystore with:

```bash
keytool -genkey -v -keystore udhaar-release.keystore \
  -alias udhaar -keyalg RSA -keysize 2048 -validity 10000
```

…then wire it into `app/android/app/build.gradle` under `signingConfigs`.

## Updating the app

Because the HTML is bundled inside the APK, the workflow after any edit is:

1. Edit `mobile.html`
2. Run `./build-apk.sh`
3. Reinstall the APK

> Updating the plain web version (`mobile.html` hosted somewhere) is instant —
> only the APK needs a rebuild.
