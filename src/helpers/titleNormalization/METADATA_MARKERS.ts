// Erweiterte Metadaten-Marker (Wichtig: alles in Kleinschreibung und ohne Akzente)
export const METADATA_MARKERS = [
    "ov", "omu", "omeu", "2d", "3d", "imax", "dolby", "atmos", "preview", "sneak", "fsk",
    "dt fassung", "deutsche fassung", "original version", "originalfassung", "untertitel",
    "english", "englisch", "70mm", "35mm", "4k", "hfr", "screenx", "4dx", "laser",
    "ukrainisch", "ukrainische fassung", "ukr", "arab", "vietnam", "span", "mehrspr", "turk", "engl",
    "montagsfilm", "malteser film cafe"
];

// Precompiled regex for performance to avoid O(N) array iteration with dynamic regex creation.
export const METADATA_MARKERS_REGEX = new RegExp(`\\b(${METADATA_MARKERS.join('|')})\\b`, 'i');
