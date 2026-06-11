import { getBigramSet } from "./getBigramSet";

export const getDiceSimilarity = (left: string, right: string) => {
    if (left.length === 0 || right.length === 0) {
        return 0;
    }

    if (left === right) {
        return 1;
    }

    const leftBigrams = getBigramSet(left);
    const rightBigrams = getBigramSet(right);
    let overlap = 0;

    for (const bigram of leftBigrams) {
        if (rightBigrams.has(bigram)) {
            overlap += 1;
        }
    }

    return (2 * overlap) / (leftBigrams.size + rightBigrams.size);
};
