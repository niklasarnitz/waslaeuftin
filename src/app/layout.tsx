import "@waslaeuftin/styles/globals.css";

import { Libre_Franklin, Rubik } from "next/font/google";

import { TRPCReactProvider } from "@waslaeuftin/trpc/react";
import Link from "next/link";
import moment from "moment-timezone";
import { isDev } from "@waslaeuftin/helpers/isDev";

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
  title: "wasäuft․in",
  description:
    "wasläuft.in ist ein Projekt, das es zum Ziel hat, eine Überblicksseite für deine Stadt bereitzustellen, auf der du siehst, welche Filme heute und in der Zukunft in deiner Stadt laufen.",
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
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <footer className="flex flex-col items-center justify-center space-y-2 py-2">
          <div className="flex flex-row items-center justify-center space-x-4">
            <Link href="/legal" className="text-sm font-light">
              Rechtliches
            </Link>
            <Link
              href="https://github.com/niklasarnitz/waslaeuftin"
              className="text-sm font-light"
            >
              GitHub
            </Link>
          </div>
        </footer>
        {!isDev && (
          <script
            defer
            src="https://umami.app.niklas.services/script.js"
            data-website-id="7538dcdd-2bff-4310-8b80-73c666f2d90a"
          />
        )}
      </body>
    </html>
  );
}
