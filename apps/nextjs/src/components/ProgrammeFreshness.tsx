import moment from "moment-timezone";

import { freshness } from "@waslaeuftin/helpers/programme";

export function ProgrammeFreshness({
  updated,
  now = new Date(),
}: {
  updated: Date | null;
  now?: Date;
}) {
  const status = freshness(updated, now);
  return (
    <span className="text-muted-foreground text-xs">
      {status === "unknown" ? (
        "Aktualisierungszeitpunkt unbekannt"
      ) : (
        <>
          Programmstand:{" "}
          <time dateTime={updated!.toISOString()}>
            {moment(updated).tz("Europe/Berlin").format("DD.MM.YYYY HH:mm")}
          </time>
          {status === "stale" && (
            <span className="text-amber-700 dark:text-amber-400">
              {" "}
              · Seit über 36 Stunden nicht aktualisiert; bitte Spielzeiten beim
              Kino prüfen.
            </span>
          )}
        </>
      )}
    </span>
  );
}
