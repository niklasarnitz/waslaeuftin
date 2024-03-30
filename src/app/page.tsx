import { db } from "@waslaeuftin/server/db";
import moment from "moment-timezone";
import Link from "next/link";

export default async function Home() {
  const cities = await db.city.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main>
      <div className="flex flex-col items-center justify-center space-y-4">
        <h1 className="pt-4 text-4xl font-bold">wasläuft.in</h1>
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/city/${city.slug}?date=${encodeURI(moment().format("YYYY-MM-DD"))}`}
            className="rounded-lg border px-4 py-2 underline shadow-sm"
          >
            {city.name}
          </Link>
        ))}
        <Link href="/request-cinema" className="text-center text-sm underline">
          Dein Kino oder deine Stadt ist noch nicht aufgeführt?
          <br />
          Wünsche es dir über diesen Link!
        </Link>
      </div>
    </main>
  );
}
