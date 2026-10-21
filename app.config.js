// Per-developer iOS signing values, read from .env.local (gitignored).
// app.json stays the main config; this file only layers these on top.
//
// Free Apple IDs can't share a bundle ID: Apple ties it to the first team that
// registers it, so each Mac developer on a free account needs their own.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.FES_IOS_BUNDLE_ID || config.ios.bundleIdentifier,
    // Owning this field here, even when it's unset, makes `expo run:ios` roll back
    // its attempt to write a personal Apple team ID into the committed app.json.
    appleTeamId: process.env.FES_APPLE_TEAM_ID || undefined,
  },
});
