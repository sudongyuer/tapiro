const fs = require('fs');
const path = require('path');
const { withDangerousMod, withInfoPlist, withXcodeProject } = require('expo/config-plugins');

const TARGET = 'TapiroLiveActivity';
const KIT = '../modules/tapiro-kit';
const SOURCES = [
  `${KIT}/ios/LiveActivity/TapiroActivityAttributes.swift`,
  `${KIT}/widget/TapiroLiveActivityWidget.swift`,
  `${KIT}/widget/TapirHead.swift`,
  `${TARGET}/MascotPaint.swift`,
];
const PAINT = ['ink', 'line', 'saddle', 'blush', 'eye', 'snout'];
const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>Tapiro</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;

function channel(hex, start) {
  return (parseInt(hex.slice(start, start + 2), 16) / 255).toFixed(4);
}

function mascotPaintSwift(projectRoot) {
  const source = fs.readFileSync(path.join(projectRoot, 'src/ui/theme/tokens.ts'), 'utf8');
  const light = source.slice(0, source.indexOf('export const darkVars'));
  const lines = PAINT.map((name) => {
    const match = light.match(new RegExp(`'--color-mascot-${name}': '#([0-9A-Fa-f]{6})'`));
    if (!match) throw new Error(`withLiveActivity: --color-mascot-${name} not found in tokens.ts`);
    const hex = match[1];
    return `  static let ${name} = Color(red: ${channel(hex, 0)}, green: ${channel(hex, 2)}, blue: ${channel(hex, 4)})`;
  });
  return `import SwiftUI\n\nenum MascotPaint {\n${lines.join('\n')}\n}\n`;
}

function withExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'Info.plist'), INFO_PLIST);
      fs.writeFileSync(
        path.join(dir, 'MascotPaint.swift'),
        mascotPaintSwift(config.modRequest.projectRoot),
      );
      return config;
    },
  ]);
}

function withExtensionTarget(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    if (project.pbxTargetByName(TARGET)) return config;
    const objects = project.hash.project.objects;
    objects.PBXTargetDependency ??= {};
    objects.PBXContainerItemProxy ??= {};

    const app = project.getFirstTarget();
    const appSettings = Object.values(project.pbxXCBuildConfigurationSection()).find(
      (entry) => entry.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER && entry.name === 'Release',
    ).buildSettings;
    const target = project.addTarget(
      TARGET,
      'app_extension',
      TARGET,
      `${config.ios.bundleIdentifier}.LiveActivity`,
    );

    const group = project.addPbxGroup([`${TARGET}/Info.plist`], TARGET);
    delete objects.PBXGroup[group.uuid].path;
    const mainGroup = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(group.uuid, mainGroup);
    project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    for (const source of SOURCES)
      project.addSourceFile(source, { target: target.uuid }, group.uuid);

    const embed = project.pbxCopyfilesBuildPhaseObj(app.uuid);
    if (embed) embed.name = '"Embed Foundation Extensions"';

    const list = project.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList];
    for (const { value } of list.buildConfigurations) {
      Object.assign(project.pbxXCBuildConfigurationSection()[value].buildSettings, {
        APPLICATION_EXTENSION_API_ONLY: 'YES',
        CODE_SIGN_STYLE: 'Automatic',
        CURRENT_PROJECT_VERSION: appSettings.CURRENT_PROJECT_VERSION ?? '1',
        INFOPLIST_FILE: `${TARGET}/Info.plist`,
        IPHONEOS_DEPLOYMENT_TARGET: config.ios.deploymentTarget,
        MARKETING_VERSION: appSettings.MARKETING_VERSION ?? config.version,
        SDKROOT: 'iphoneos',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '1',
        ...(appSettings.DEVELOPMENT_TEAM ? { DEVELOPMENT_TEAM: appSettings.DEVELOPMENT_TEAM } : {}),
      });
    }
    return config;
  });
}

// Gate (docs/plans/2026-11-11-live-activity-spike.md, 278 A): the extension is generated only when prebuild runs with
// TAPIRO_LIVE_ACTIVITY=1, so verify and release builds carry none until it ships together with push.
module.exports = function withLiveActivity(config) {
  if (process.env.TAPIRO_LIVE_ACTIVITY !== '1') return config;
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    return config;
  });
  return withExtensionTarget(withExtensionFiles(config));
};
