const { withEntitlementsPlist } = require('expo/config-plugins');

// expo-apple-authentication's plugin is auto-applied whenever the package is installed and always adds
// this entitlement, which a free Apple team cannot sign. Remove this plugin once the paid team exists.
module.exports = function withoutAppleSignInEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['com.apple.developer.applesignin'];
    return config;
  });
};
