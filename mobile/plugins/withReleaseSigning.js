const { withAppBuildGradle } = require('expo/config-plugins');

const GRADLE_PROPERTY = 'UDHAAR_RELEASE_STORE_FILE';
const DEBUG_SIGNING = 'signingConfig signingConfigs.debug';
const PRIVATE_SIGNING =
  `signingConfig project.hasProperty('${GRADLE_PROPERTY}') ` +
  '? signingConfigs.release : signingConfigs.debug';

const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('${GRADLE_PROPERTY}')) {
                storeFile file(${GRADLE_PROPERTY})
                storePassword UDHAAR_RELEASE_STORE_PASSWORD
                keyAlias UDHAAR_RELEASE_KEY_ALIAS
                keyPassword UDHAAR_RELEASE_KEY_PASSWORD
            }
        }`;

/**
 * Udhaar's release builds are signed with a private keystore configured via
 * four UDHAAR_RELEASE_* properties in ~/.gradle/gradle.properties (kept
 * outside the repo; see docs/DEVELOPING.md). Without them the release build
 * type falls back to the debug key so a fresh clone can still build —
 * scripts/build-release.sh refuses to ship unless the private key is present.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: app/build.gradle is not Groovy');
    }
    let contents = cfg.modResults.contents;
    const alreadyPatched = contents.includes(GRADLE_PROPERTY);

    if (!alreadyPatched) {
      const anchor = /(signingConfigs \{)([\s\S]*?)(\n    \}\n    buildTypes)/;
      if (!anchor.test(contents)) {
        throw new Error('withReleaseSigning: signingConfigs / buildTypes block not found');
      }
      contents = contents.replace(
        anchor,
        (_match, open, body, tail) => `${open}${body}\n${RELEASE_SIGNING_CONFIG}${tail}`,
      );
    }

    const count = contents.split(DEBUG_SIGNING).length - 1;
    if (count === 2) {
      const [head, middle, tail] = contents.split(DEBUG_SIGNING);
      contents = head + DEBUG_SIGNING + middle + PRIVATE_SIGNING + tail;
    } else if (!(alreadyPatched && count === 1)) {
      throw new Error(
        `withReleaseSigning: expected 2 occurrences of "${DEBUG_SIGNING}", found ${count}`,
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
