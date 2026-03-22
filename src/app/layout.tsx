import "@waslaeuftin/styles/globals.css";

import { Libre_Franklin, Rubik } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { TRPCReactProvider } from "@waslaeuftin/trpc/react";
import Link from "next/link";
import moment from "moment-timezone";
import { Analytics } from "@waslaeuftin/components/Analytics";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

const libre_franklin = Libre_Franklin({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-libre_franklin",
});

export const metadata = {
  title: "wasläuft․in",
  description:
    "wasläuft․in ist ein Projekt, das es zum Ziel hat, eine Überblicksseite für deine Stadt bereitzustellen, auf der du siehst, welche Filme heute und in der Zukunft in deiner Stadt laufen.",
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
        <NuqsAdapter>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </NuqsAdapter>
        <footer className="mt-4 border-t border-border/70 bg-background/80 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1200px] flex-row items-center justify-center space-x-4 px-4 md:justify-end md:px-6">
            <Link
              href="/legal"
              className="text-sm font-light text-muted-foreground hover:text-foreground"
            >
              Rechtliches
            </Link>
            <Link
              href="https://github.com/niklasarnitz/waslaeuftin"
              className="text-sm font-light text-muted-foreground hover:text-foreground"
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
