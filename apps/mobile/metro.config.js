// Expo configure automatiquement Metro pour le monorepo (dossiers surveillés, node_modules).
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
// better-auth utilise le champ « exports » des paquets
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: "./global.css" });
