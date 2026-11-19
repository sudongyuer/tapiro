const googleSignIn = require('@react-native-google-signin/google-signin/app.plugin.js').default;

const IOS_CLIENT_ID = /^([\w-]+)\.apps\.googleusercontent\.com$/;

function googleUrlScheme(clientId) {
  const match = IOS_CLIENT_ID.exec(clientId);
  if (!match) {
    throw new Error(
      `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must look like <id>.apps.googleusercontent.com, got "${clientId}".`,
    );
  }
  return `com.googleusercontent.apps.${match[1]}`;
}

// The client IDs are public but owner-specific, so they come from EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (loaded from
// .env by `expo prebuild`) instead of app.json. Without one, the app builds with Google sign-in unconfigured.
function withGoogleSignIn(config) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!clientId) return config;
  return googleSignIn(config, { iosUrlScheme: googleUrlScheme(clientId) });
}

module.exports = withGoogleSignIn;
module.exports.googleUrlScheme = googleUrlScheme;
