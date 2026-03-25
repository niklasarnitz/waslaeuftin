export const clampScore = (value: number) => {
    return Math.max(0, Math.min(1, value));
};
