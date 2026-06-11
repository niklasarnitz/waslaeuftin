import { sanitizeWhitespace } from "@waslaeuftin/helpers/titleNormalization/sanitizeWhitespace";

export const normalizeForTagCheck = (value: string) => {
  return sanitizeWhitespace(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Entfernt Akzente (z.B. Café -> Cafe)
      .toLowerCase(),
  );
};
