export const getUrlPathJoin = (...parts: string[]) => {
    return parts
        .map((part, index) => {
            if (index === 0) {
                return part.replace(/\/+$/, "");
            }

            return part.replace(/^\/+|\/+$/g, "");
        })
        .filter(Boolean)
        .join("/");
};
