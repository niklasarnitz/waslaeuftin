// ─── Similarity scoring ─────────────────────────────────────────────────────
export const getBigramSet = (value: string) => {
    const compact = value.replace(/\s+/g, "");

    if (compact.length < 2) {
        return new Set([compact]);
    }

    const bigrams = new Set<string>();

    for (let index = 0; index < compact.length - 1; index += 1) {
        bigrams.add(compact.slice(index, index + 2));
    }

    return bigrams;
};
