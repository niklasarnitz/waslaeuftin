import { type Metadata } from "next";
import Image from "next/image";
import { Apple, Smartphone } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@waslaeuftin/components/ui/card";
import { Constants } from "@waslaeuftin/globals/Constants";

// AltStore deep link — see https://faq.altstore.io/developers/download-on-altstore-badge
// Format: https://altstore.io/source/URL/TO/SOURCE.json?app=BUNDLE_ID
const ALTSTORE_DEEP_LINK =
  "https://altstore.io/source/waslaeuft.in/altstore/source.json?app=com.niklasarnitz.waslaeuftin";

export function generateMetadata(): Metadata {
  return {
    title: `App herunterladen | ${Constants.appName}`,
    description:
      "Lade die wasläuft.in App für Android (APK) oder iOS (über AltStore) herunter.",
  };
}

export default function DownloadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold tracking-tight">App herunterladen</h1>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm">
          Hol dir {Constants.appName} auf dein Smartphone – als Android-APK zum
          direkten Installieren oder per AltStore auf dem iPhone.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Android */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-xl">
              <Smartphone className="h-5 w-5" />
            </div>
            <CardTitle>Android</CardTitle>
            <CardDescription>
              Lade die APK herunter und installiere sie direkt. Aktiviere dafür
              auf deinem Gerät „Installation aus unbekannten Quellen“.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <a
              href="/waslaeuftin.apk"
              download
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium shadow transition-colors"
            >
              <Smartphone className="h-4 w-4" />
              APK herunterladen
            </a>
          </CardContent>
        </Card>

        {/* iOS / AltStore */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-xl">
              <Apple className="h-5 w-5" />
            </div>
            <CardTitle>iOS (AltStore)</CardTitle>
            <CardDescription>
              Öffne die AltStore-Quelle direkt in AltStore oder SideStore und
              installiere die App mit deiner eigenen Apple-ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-3">
            <a
              href={ALTSTORE_DEEP_LINK}
              className="inline-block"
              aria-label="Download on AltStore"
            >
              <Image
                src="/altstore-badge-dark.png"
                alt="Download on AltStore"
                width={200}
                height={64}
                className="object-contain dark:hidden"
              />
              <Image
                src="/altstore-badge-light.png"
                alt="Download on AltStore"
                width={200}
                height={64}
                className="hidden object-contain dark:block"
              />
            </a>
            <p className="text-muted-foreground text-xs">
              Quelle manuell hinzufügen:{" "}
              <code className="bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-[11px] select-all">
                https://waslaeuft.in/altstore/source.json
              </code>{" "}
              · oder{" "}
              <a
                href="/altstore/source.json"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium underline"
              >
                source.json
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
