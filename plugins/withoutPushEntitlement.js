const { withEntitlementsPlist } = require('expo/config-plugins');

const ENTITLEMENT = 'aps-environment';

// expo-notifications' plugin is auto-applied whenever the package is installed and always adds this entitlement,
// which a free Apple team cannot sign. Local notifications do not need it. Remove this plugin with the paid team.
module.exports = function withoutPushEntitlement(config) {
  if (config.ios?.entitlements?.[ENTITLEMENT] !== undefined) {
    throw new Error(
      `withoutPushEntitlement strips ${ENTITLEMENT}, but ios.entitlements sets it. Remove ./plugins/withoutPushEntitlement from app.json plugins.`,
    );
  }
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults[ENTITLEMENT];
    return config;
  });
};
