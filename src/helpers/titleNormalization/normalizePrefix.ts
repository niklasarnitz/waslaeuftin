export const normalizePrefix = (value: string) => {
    return value.replace(/^\/+|\/+$/g, "");
};
