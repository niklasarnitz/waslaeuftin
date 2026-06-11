export const getTokenOverlapScore = (left: string, right: string) => {
    const leftTokens = new Set(left.split(" ").filter(Boolean));
    const rightTokens = new Set(right.split(" ").filter(Boolean));

    if (leftTokens.size === 0 || rightTokens.size === 0) {
        return 0;
    }

    let overlap = 0;

    for (const token of leftTokens) {
        if (rightTokens.has(token)) {
            overlap += 1;
        }
    }

    return overlap / Math.max(leftTokens.size, rightTokens.size);
};
