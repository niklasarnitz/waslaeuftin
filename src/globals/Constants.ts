export const Constants = {
  appName: "wasläuft․in",
  home: {
    cta: "Finde jetzt heraus, welche Filme heute in deiner Stadt laufen.",
    subtitle: "Entdecke, welche Filme heute noch in deiner Stadt laufen.",
  },
  ["not-found"]: {
    page: "Diese Seite konnte nicht gefunden werden.",
  },
  error: "Fehler",
  ["what-movies-are-showing-in"]: {
    city: (city: string) => `Welche Filme laufen in ${city}?`,
    cinema: (cinema: string) => `Welche Filme laufen im ${cinema}?`,
  },
  ["what-movies-are-showing-soon-in"]: {
    city: (city: string) => `Welche Filme laufen bald in ${city}?`,
    cinema: (cinema: string) => `Welche Filme laufen bald im ${cinema}?`,
    cta: {
      city: (city: string) =>
        `Finde jetzt heraus, welche Filme bald in ${city} laufen.`,
      cinema: "Finde jetzt heraus, welche Filme bald in deinem Kino laufen.",
    },
  },
  ["whats-showing-in-date"]: {
    cinema: (cinema: string, date: string) => `Was läuft ${date} im ${cinema}?`,
    city: (city: string, date: string) => `Was läuft ${date} in ${city}?`,
    favorites: (date: string) =>
      `Was läuft ${date} in deinen Favorisierten Städten?`,
  },
  ["find-out-which-movies-are-showing-in"]: {
    city: (city: string) =>
      `Finde jetzt heraus, welche Filme heute in ${city} laufen.`,
    cinema: "Finde jetzt heraus, welche Filme heute in deinem Kino laufen.",
  },
};
