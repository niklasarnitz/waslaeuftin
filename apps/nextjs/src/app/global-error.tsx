"use client";

import { useEffect } from "react";
import NextError from "next/error";
import { captureException } from "@sentry/nextjs";

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
