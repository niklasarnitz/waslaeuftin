import { fallbackLocale, type locales } from "./settings";
import { createInstance } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next/initReactI18next";

export const cookieName = "i18next";

const initI18next = async (locale: (typeof locales)[number]) => {
  const i18nInstance = createInstance();

  let lng = fallbackLocale;

  switch (locale) {
    case "uk":
    case "ie":
      lng = "en";
      break;
    default:
      break;
  }

  await i18nInstance
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (language: string) => import(`./locales/${language}.json`),
      ),
    )
    .init({
      supportedLngs: ["de", "en"],
      fallbackLng: fallbackLocale,
      lng,
    });
  return i18nInstance;
};

export async function useTranslation(locale: (typeof locales)[number]) {
  const i18nextInstance = await initI18next(locale);
  return {
    t: i18nextInstance.getFixedT(locale),
    i18n: i18nextInstance,
  };
}
