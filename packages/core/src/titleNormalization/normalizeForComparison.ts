import { sanitizeWhitespace } from "./sanitizeWhitespace";

export const normalizeForComparison = (value: string) => {
  return sanitizeWhitespace(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/ß/g, "ss")
      .replace(/&/g, " und ")
      .replace(/[^\p{L}\p{N}\s]/gu, " "),
  );
};
