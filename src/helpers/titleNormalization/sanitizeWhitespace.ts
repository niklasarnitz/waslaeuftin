// ─── String normalization & Parsing ─────────────────────────────────────────
export const sanitizeWhitespace = (value: string) => {
    return value.replace(/\s+/g, " ").trim();
};
