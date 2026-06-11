export const encodeObjectKeyForPublicUrl = (key: string) => {
    return key
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/");
};
