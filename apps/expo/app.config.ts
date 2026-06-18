import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "wasläuft.in",
  slug: "waslauftin",
  scheme: "waslauftin",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon-light.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.niklasarnitz.waslaeuftin",
    supportsTablet: true,
    icon: {
      light: "./assets/icon-light.png",
      dark: "./assets/icon-dark.png",
    },
    infoPlist: {
      // App uses only standard/exempt encryption (HTTPS) — skips the
      // export-compliance prompt on every App Store build/submit.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.niklasarnitz.waslaeuftin",
    adaptiveIcon: {
      foregroundImage: "./assets/icon-light.png",
      backgroundColor: "#1F104A",
    },
  },
  extra: {
    eas: {
      projectId: "6e8988f3-eb9e-4beb-a4ad-3465c7f6a278",
    },
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    reactCanary: true,
    reactCompiler: true,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        color: "#1F104A",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Um die Kinos in der Nähe zu finden, gib bitte der App Standort-Berechtigungen.",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#E4E4E7",
        image: "./assets/icon-light.png",
        dark: {
          backgroundColor: "#18181B",
          image: "./assets/icon-dark.png",
        },
      },
    ],
  ],
  owner: "niklasarnitz",
});
