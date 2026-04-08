// Erweiterte Metadaten-Marker (Wichtig: alles in Kleinschreibung und ohne Akzente)
export const METADATA_MARKERS = [
    "ov", "omu", "omeu", "2d", "3d", "imax", "dolby", "atmos", "preview", "sneak", "fsk",
    "dt fassung", "deutsche fassung", "original version", "originalfassung", "untertitel",
    "english", "englisch", "70mm", "35mm", "4k", "hfr", "screenx", "4dx", "laser",
    "ukrainisch", "ukrainische fassung", "ukr", "arab", "vietnam", "span", "mehrspr", "turk", "engl",
    "montagsfilm", "malteser film cafe"
];

export const METADATA_PATTERN = new RegExp(`\\b(?:${METADATA_MARKERS.join("|")})\\b`, "i");
