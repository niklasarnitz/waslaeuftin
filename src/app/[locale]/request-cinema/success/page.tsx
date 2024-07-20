"use client";

import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function DidCreateMovieRequest({
  params,
}: {
  params: { locale: string };
}) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RequestSuccess params={params} />
    </Suspense>
  );
}

const RequestSuccess = ({ params }: { params: { locale: string } }) => {
  const searchParams = useSearchParams();

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Kino Wunsch gespeichert</h1>
      <p className="text-gray-500">
        Vielen Dank für deine Wunsch.
        {searchParams.get("issue-number") && (
          <>
            <br />
            Den aktuellen Status deines Wunsches kannst du unter folgendem Link
            einsehen:
            <br />
            <Link
              href={`https://github.com/niklasarnitz/waslaeuftin/issues/${searchParams.get("issue-number")}`}
            >{`https://github.com/niklasarnitz/waslaeuftin/issues/${searchParams.get("issue-number")}`}</Link>
          </>
        )}
      </p>
    </div>
  );
};
