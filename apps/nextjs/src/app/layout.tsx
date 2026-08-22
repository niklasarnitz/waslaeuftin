import "@waslaeuftin/styles/globals.css";

import { Libre_Franklin, Rubik } from "next/font/google";
import Link from "next/link";
import moment from "moment-timezone";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Analytics } from "@waslaeuftin/components/Analytics";
import { SmartBanner } from "@waslaeuftin/components/SmartBanner";
import { TRPCReactProvider } from "@waslaeuftin/trpc/react";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-rubik",
});

const libre_franklin = Libre_Franklin({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-libre_franklin",
});

export const metadata = {
  title: "wasläuft․in",
  description:
    "wasläuft․in ist ein Projekt, das es zum Ziel hat, eine Überblicksseite für deine Stadt bereitzustellen, auf der du siehst, welche Filme heute und in der Zukunft in deiner Stadt laufen.",
  other: {
    "apple-itunes-app": "app-id=6781673099",
    "smartbanner:title": "wasläuft.in",
    "smartbanner:author": "wasläuft.in",
    "smartbanner:price": "GRATIS",
    "smartbanner:price-suffix-apple": " - Im App Store",
    "smartbanner:icon-apple": "/apple-touch-icon.png",
    "smartbanner:button": "LADEN",
    "smartbanner:button-url-apple":
      "https://apps.apple.com/de/app/wasl%C3%A4uft-in-deinem-kino/id6781673099",
    "smartbanner:enabled-platforms": "ios",
    "smartbanner:close-label": "Schließen",
  },
};

moment().tz("Europe/Berlin");
moment.tz.setDefault("Europe/Berlin");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={libre_franklin.variable + " " + rubik.variable}>
        <SmartBanner />
        <NuqsAdapter>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </NuqsAdapter>
        <footer className="border-border/70 bg-background/80 mt-4 border-t py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1200px] flex-row items-center justify-center space-x-4 px-4 md:justify-end md:px-6">
            <Link
              href="/legal"
              className="text-muted-foreground hover:text-foreground text-sm font-light"
            >
              Rechtliches
            </Link>
            <Link
              href="https://github.com/niklasarnitz/waslaeuftin"
              className="text-muted-foreground hover:text-foreground text-sm font-light"
            >
              GitHub
            </Link>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
