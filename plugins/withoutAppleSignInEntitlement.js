const { withEntitlementsPlist } = require('expo/config-plugins');

const ENTITLEMENT = 'com.apple.developer.applesignin';

// expo-apple-authentication's plugin is auto-applied whenever the package is installed and always adds
// this entitlement, which a free Apple team cannot sign. Remove this plugin once the paid team exists.
module.exports = function withoutAppleSignInEntitlement(config) {
  const requested = [
    config.ios?.usesAppleSignIn === true && 'ios.usesAppleSignIn is true',
    config.ios?.entitlements?.[ENTITLEMENT] !== undefined && `ios.entitlements sets ${ENTITLEMENT}`,
  ].filter(Boolean);
  if (requested.length > 0) {
    throw new Error(
      `withoutAppleSignInEntitlement strips ${ENTITLEMENT}, but Sign in with Apple is requested (${requested.join(
        '; ',
      )}). Remove ./plugins/withoutAppleSignInEntitlement from app.json plugins.`,
    );
  }
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults[ENTITLEMENT];
    return config;
  });
};
