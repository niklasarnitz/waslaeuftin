import { Cities } from "@waslaeuftin/helpers/cities";
import Link from "next/link";

export default async function Home() {
  return (
    <main>
      <div className="flex flex-col items-center justify-center space-y-4 lg:h-screen">
        <h1 className="pt-4 text-4xl font-bold lg:pt-0">wasläuft.in</h1>
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
