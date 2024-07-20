export const fallbackLocale = "de";
export const locales = ["de", "uk", "ie"] as const;

export type Locale = (typeof locales)[number];
