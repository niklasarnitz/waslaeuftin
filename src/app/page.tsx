import Link from "next/link";

export default async function Home() {
  return (
    <main>
      <div className="flex h-screen flex-col items-center justify-center space-y-4">
        <h1 className="text-4xl font-bold">wasläuft.in</h1>
        <Link
          href="/city/karlsruhe"
          className="rounded-lg border p-4  underline shadow-sm"
        >
          Karlsruhe
        </Link>
      </div>
    </main>
  );
}
