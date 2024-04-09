import { Button } from "@waslaeuftin/components/ui/button";
import { db } from "@waslaeuftin/server/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
            href={`/city/${city.slug}/today`}
            className="dark:border-background-muted rounded-lg border shadow-sm dark:hover:border-foreground/60"
          >
            <Button variant="link" className="dark:text-foreground">
              {city.name}
            </Button>
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
