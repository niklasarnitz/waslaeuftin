export const Constants = {
  appName: "wasläuft․in",
  home: {
    title: "Was läuft heute im Kino? - Kino-Programm in deiner Nähe",
    cta: "Finde jetzt heraus, welche Filme heute in deiner Stadt laufen. Aktuelles Kino-Programm für deine Nähe auf wasläuft.in.",
    subtitle: "Entdecke, welche Filme heute noch in deiner Stadt laufen.",
  },
  ["not-found"]: {
    page: "Diese Seite konnte nicht gefunden werden.",
  },
  error: "Fehler",
  ["what-movies-are-showing-in"]: {
    city: (city: string) => `Kino-Programm ${city}: Was läuft heute im Kino?`,
    cinema: (cinema: string) => `Kino-Programm ${cinema}: Was läuft heute?`,
  },
  ["what-movies-are-showing-soon-in"]: {
    city: (city: string) => `Kino-Programm ${city}: Was läuft heute im Kino?`,
    cinema: (cinema: string) => `Kino-Programm ${cinema}: Was läuft heute?`,
    cta: {
      city: (city: string) =>
        `Finde jetzt das aktuelle Kino-Programm für ${city} heraus. Was läuft heute im Kino?`,
      cinema: "Finde jetzt das aktuelle Kino-Programm in deinem Kino heraus. Was läuft heute?",
    },
  },
  ["whats-showing-in-date"]: {
    cinema: (cinema: string, date: string) => `Was läuft ${date} im ${cinema}?`,
    city: (city: string, date: string) => `Was läuft ${date} in ${city}?`,
    home: (date: string) =>
      `Was läuft ${date} in deiner Nähe?`,
  },
  ["find-out-which-movies-are-showing-in"]: {
    city: (city: string) =>
      `Finde jetzt heraus, welche Filme heute in ${city} laufen.`,
    cinema: "Finde jetzt heraus, welche Filme heute in deinem Kino laufen.",
  },
};
