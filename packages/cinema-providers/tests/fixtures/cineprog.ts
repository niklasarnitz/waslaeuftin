// Reduced public records from the 2026-11-02 Cineprog research. In particular,
// Park's later fixticket really does point at the earlier desktop performance.
export const cineprogWokiSession = {
  datum: "2026-11-05",
  zeit: "15:00",
  saal: "1",
  saal_bezeichnung: "Goldener Saal",
  link_desktop: {},
  link_mobile:
    "https%3A%2F%2Fwww.kinoheld.de%2FKino-Bonn%2FWOKI%3Fmode%3Dwidget%26change%3D0%26rb%3D1%26showId%3D52631&ref=mobile",
  link_fixticket:
    "https://www.kinoheld.de/Kino-Bonn/WOKI?mode=widget&change=0&rb=1&showId=52631",
  external_ticket_url: "",
  resab: "2026-11-02*15:05:00",
  resbis: "2026-11-05*15:00:00",
};

export const cineprogParkSession = {
  datum: "2026-11-02",
  zeit: "19:30",
  saal: "1",
  saal_bezeichnung: "Kino A",
  link_desktop:
    "https://iframe.cineorder.park-kino.de/landingpage?center=10000000014HBMPOEA&page=seatingplan&language=de&FilmID=E7F00000012BSAMYRA&performance=62171000023BSAMYRA",
  link_mobile:
    "https://iframe.cineorder.park-kino.de/landingpage?center=10000000014HBMPOEA&page=seatingplan&language=de&FilmID=E7F00000012BSAMYRA&performance=62171000023BSAMYRA",
  link_fixticket:
    "https://iframe.cineorder.park-kino.de/landingpage?center=10000000014HBMPOEA&page=seatingplan&language=de&FilmID=E7F00000012BSAMYRA&performance=52171000023BSAMYRA",
  external_ticket_url: "",
};

export const cineprogWokiFacts = {
  idf: "125231",
  titel: "Geister",
  director: "Fatih Akin",
  laufzeit: "105",
  Versionsmarker: "2D",
  OrigVersion: {},
  OmitU: {},
  klon_von: {},
  filmreihe_name: "Neu im WOKI",
  nachtext: "Deutsche Fassung!",
  KinoStart_D: "2026-11-05",
};

export const cineprogWokiDetail = {
  ...cineprogWokiFacts,
  originaltitel: "Geister",
  produktionsland: "Deutschland 2026",
  klon_von: "125231M",
  castcrew: { Regie: { person_1: "Fatih Akin" } },
  AudioDescription: {},
  ClosedCaption: {},
  ki_erzeugt: "false",
};

export const cineprogGroupFacts = {
  OrigVersion: {},
  OmitU: {},
  DreiD: {},
  GretaStarks: "1",
  DolbySiebenEins: "1",
};
