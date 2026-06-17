// Generates / updates the AltStore source JSON that AltStore & SideStore
// subscribe to. Invoked by build-ios-altstore.sh after a successful IPA build.
//
// It merges the freshly built version into the source's version history
// (replacing an entry with the same version+buildVersion, otherwise prepending
// the new one) so the committed source.json carries a changelog over time. It
// also mirrors the newest version into the legacy top-level fields for older
// AltStore clients. Output is pretty-printed for clean, reviewable diffs.
//
// All inputs come from environment variables set by the build script:
//   SOURCE_OUT, BASE_URL, IPA_NAME, IPA_SIZE, APP_VERSION, APP_BUILD,
//   APP_MIN_OS, APP_BUNDLE_ID, APP_DATE, APP_CHANGELOG

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const env = (key, fallback = undefined) => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`generate-altstore-source: missing env var ${key}`);
  }
  return value;
};

const OUT = env("SOURCE_OUT");
const BASE_URL = env("BASE_URL").replace(/\/+$/, "");
const IPA_NAME = env("IPA_NAME");
const BUNDLE_ID = env("APP_BUNDLE_ID");
const VERSION = env("APP_VERSION");
const BUILD = env("APP_BUILD");
const SIZE = Number(env("IPA_SIZE"));
const MIN_OS = env("APP_MIN_OS");
const DATE = env("APP_DATE");
const CHANGELOG = env("APP_CHANGELOG", "Neuer Build.");

const ICON_URL = `${BASE_URL}/altstore/icon.png`;
const DOWNLOAD_URL = `${BASE_URL}/altstore/${IPA_NAME}`;
const TINT = "#046495"; // app accent

const newVersion = {
  version: VERSION,
  buildVersion: BUILD,
  date: DATE,
  localizedDescription: CHANGELOG,
  downloadURL: DOWNLOAD_URL,
  size: SIZE,
  minOSVersion: MIN_OS,
};

const freshApp = () => ({
  name: "wasläuft.in",
  bundleIdentifier: BUNDLE_ID,
  developerName: "Niklas Arnitz",
  subtitle: "Kinoübersicht für Städte",
  localizedDescription:
    "waslaeuft.in bietet eine Übersicht, welche Filme in deiner Stadt heute " +
    "und zukünftig laufen.",
  iconURL: ICON_URL,
  tintColor: TINT,
  category: "lifestyle",
  screenshotURLs: [],
  versions: [],
  appPermissions: {
    entitlements: [],
    privacy: {
      NSLocationWhenInUseUsageDescription:
        "Um die Kinos in der Nähe zu finden, gib bitte der App Standort-Berechtigungen.",
    },
  },
});

const freshSource = () => ({
  name: "wasläuft.in",
  identifier: "in.waslaeuft",
  subtitle: "Deine Kinoübersicht für die Stadt",
  description: "Offizielle AltStore-Quelle für wasläuft.in.",
  iconURL: ICON_URL,
  website: BASE_URL,
  tintColor: TINT,
  featuredApps: [BUNDLE_ID],
  apps: [freshApp()],
  news: [],
});

const source = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : freshSource();

source.apps ??= [];
let app = source.apps.find((a) => a.bundleIdentifier === BUNDLE_ID);
if (!app) {
  app = freshApp();
  source.apps.push(app);
}

app.versions ??= [];
// Replace an existing entry for this version+build, else prepend (newest first).
app.versions = app.versions.filter(
  (v) => !(v.version === VERSION && v.buildVersion === BUILD),
);
app.versions.unshift(newVersion);

// Mirror newest version into legacy top-level fields for older AltStore clients.
const latest = app.versions[0];
app.version = latest.version;
app.buildVersion = latest.buildVersion;
app.versionDate = latest.date;
app.versionDescription = latest.localizedDescription;
app.downloadURL = latest.downloadURL;
app.size = latest.size;
app.minOSVersion = latest.minOSVersion;

writeFileSync(OUT, `${JSON.stringify(source, null, 2)}\n`);
console.log(
  `✓ AltStore source updated: ${OUT}\n  ${app.name} ${VERSION} (build ${BUILD}), ${SIZE} bytes → ${DOWNLOAD_URL}`,
);
