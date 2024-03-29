import { Cities } from "@waslaeuftin/helpers/cities";
import Link from "next/link";

export default async function Home() {
  return (
    <main>
      <div className="flex flex-col items-center justify-center space-y-4">
        <h1 className="pt-4 text-4xl font-bold">wasläuft.in</h1>
        {Object.keys(Cities)
          .sort(
            (a, b) => Cities[a]?.name.localeCompare(Cities[b]?.name ?? "") ?? 0,
          )
          .map((city) => (
            <Link
              key={city}
              href={`/city/${city}/today`}
              className="rounded-lg border px-4 py-2 underline shadow-sm"
            >
              {Cities[city]?.name}
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
