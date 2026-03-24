#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
    console.error('Usage: publish-ipa.js <ipaPath> <bundleId> <version>');
    process.exit(1);
}

const [ipaPath, bundleId, version] = process.argv.slice(2);
if (!ipaPath || !bundleId || !version) usage();

const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');
const targetDir = path.join(publicDir, 'app', version);
fs.mkdirSync(targetDir, { recursive: true });

const ipaFilename = path.basename(ipaPath);
const destPath = path.join(targetDir, ipaFilename);
try {
    fs.copyFileSync(ipaPath, destPath);
} catch (err) {
    console.error('Failed to copy IPA:', err.message);
    process.exit(2);
}

const size = fs.statSync(destPath).size;

const altStorePath = path.join(publicDir, 'altstore.json');
let alt = {
    name: 'WasLaeuftIn Source',
    subtitle: '',
    description: '',
    iconURL: '',
    headerURL: '',
    website: '',
    tintColor: '#000000',
    featuredApps: [],
    apps: [],
    news: []
};

if (fs.existsSync(altStorePath)) {
    try {
        alt = JSON.parse(fs.readFileSync(altStorePath, 'utf8'));
    } catch (err) {
        console.error('Failed to parse existing altStore.json, aborting:', err.message);
        process.exit(3);
    }
}

if (!Array.isArray(alt.apps)) alt.apps = [];

let app = alt.apps.find(a => a.bundleIdentifier === bundleId);
if (!app) {
    app = {
        name: 'WasLaeuftIn',
        bundleIdentifier: bundleId,
        developerName: '',
        subtitle: '',
        localizedDescription: '',
        iconURL: '',
        tintColor: '#000000',
        screenshots: [],
        versions: []
    };
    alt.apps.unshift(app);
}

const downloadURL = `https://waslaeuft.in/app/${version}/${encodeURIComponent(ipaFilename)}`;

const versionEntry = {
    version: version,
    date: new Date().toISOString(),
    size: size,
    downloadURL: downloadURL,
    localizedDescription: ''
};

// Prepend new version
app.versions = app.versions || [];
// Avoid duplicate version entries
if (!app.versions.find(v => v.version === version)) {
    app.versions.unshift(versionEntry);
} else {
    // replace existing
    app.versions = app.versions.map(v => (v.version === version ? versionEntry : v));
}

try {
    fs.writeFileSync(altStorePath, JSON.stringify(alt, null, 4), 'utf8');
    console.log('Updated', altStorePath);
    console.log('IPA published to', destPath);
} catch (err) {
    console.error('Failed to write altStore.json:', err.message);
    process.exit(4);
}

process.exit(0);
