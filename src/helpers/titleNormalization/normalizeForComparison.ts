import { sanitizeWhitespace } from "./sanitizeWhitespace";


export const normalizeForComparison = (value: string) => {
    return sanitizeWhitespace(
        value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/&/g, " und ")
            .replace(/[^a-z0-9\s]/g, " ")
    );
};
