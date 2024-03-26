import { Cities } from "@waslaeuftin/helpers/cities";
import Link from "next/link";

export default async function Home() {
  return (
    <main>
      <div className="flex h-screen flex-col items-center justify-center space-y-4">
        <h1 className="text-4xl font-bold">wasläuft.in</h1>
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
      </div>
    </main>
  );
}
