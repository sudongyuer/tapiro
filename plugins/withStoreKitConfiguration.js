const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const SOURCE = 'ios-config/Tapiro.storekit';
const FILE = path.basename(SOURCE);

// Xcode applies a scheme's StoreKit configuration only when Xcode itself launches the app (Run). Launches by
// `expo run:ios`, `xcodebuild` or `simctl launch` see an empty catalog; automated runs load the same file through
// SKTestSession in verification/storekit (docs/plans/2026-11-11-iap-local.md, spike A).
function withSchemeReference(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const { projectRoot, platformProjectRoot, projectName } = config.modRequest;
      fs.copyFileSync(
        path.join(projectRoot, SOURCE),
        path.join(platformProjectRoot, projectName, FILE),
      );

      const scheme = path.join(
        platformProjectRoot,
        `${projectName}.xcodeproj`,
        'xcshareddata',
        'xcschemes',
        `${projectName}.xcscheme`,
      );
      const xml = fs.readFileSync(scheme, 'utf8');
      const reference = `      <StoreKitConfigurationFileReference\n         identifier = "../../${projectName}/${FILE}">\n      </StoreKitConfigurationFileReference>\n`;
      const withoutOld = xml.replace(
        /[ \t]*<StoreKitConfigurationFileReference[\s\S]*?<\/StoreKitConfigurationFileReference>\n/g,
        '',
      );
      const updated = withoutOld.replace(
        /([ \t]*)<\/LaunchAction>/,
        `${reference}$1</LaunchAction>`,
      );
      if (updated === withoutOld) {
        throw new Error(`withStoreKitConfiguration: no LaunchAction in ${scheme}`);
      }
      fs.writeFileSync(scheme, updated);
      return config;
    },
  ]);
}

module.exports = function withStoreKitConfiguration(config) {
  return withSchemeReference(config);
};
