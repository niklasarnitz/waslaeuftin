import Link from "next/link";
import moment from "moment-timezone";

import type { buildHighlights } from "@waslaeuftin/helpers/programme";
import { listingPath } from "@waslaeuftin/helpers/seo";

export function ProgrammeHighlights({
  city,
  highlights,
}: {
  city: string;
  highlights: ReturnType<typeof buildHighlights>;
}) {
  const sections = [
    {
      title: `Heute Abend in ${city}`,
      note: "Ab 18 Uhr",
      data: highlights.evening,
    },
    {
      title: `Originalversion in ${city}`,
      note: "Heute · OV und untertitelte Originalfassungen",
      data: highlights.original,
    },
    {
      title: `Demnächst in ${city}`,
      note: "Ab morgen · nächste 7 Tage",
      data: highlights.upcoming,
    },
  ];
  return (
    <details className="border-border/60 mt-8 border-t pt-4">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
        Abendprogramm, Originalfassungen und kommende Filme
      </summary>
      <div className="mt-4 grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} className="min-w-0">
            <h2 className="text-sm font-bold">{section.title}</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {section.note} · {section.data.count} Vorstellungen
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              {section.data.items.map((showing) => {
                const date = moment(showing.dateTime).tz("Europe/Berlin");
                return (
                  <li key={`${showing.movie.name}-${showing.cinema.slug}`}>
                    <Link
                      className="font-semibold hover:underline"
                      href={`${listingPath("cinema", showing.cinema.slug)}?date=${date.format("YYYY-MM-DD")}`}
                    >
                      {showing.movie.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {showing.cinema.name} ·{" "}
                      <time dateTime={showing.dateTime.toISOString()}>
                        {date.format("DD.MM. HH:mm")}
                      </time>
                    </p>
                  </li>
                );
              })}
            </ul>
            {section.data.count === 0 && (
              <p className="text-muted-foreground mt-3 text-xs">
                Aktuell keine passenden Vorstellungen gemeldet.
              </p>
            )}
          </section>
        ))}
      </div>
    </details>
  );
}
