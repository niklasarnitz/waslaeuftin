import "@waslaeuftin/styles/globals.css";

import { Inter } from "next/font/google";

import { TRPCReactProvider } from "@waslaeuftin/trpc/react";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "wasläuft.in",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={`font-sans ${inter.variable}`}>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <footer className="flex flex-col items-center justify-center pb-4">
          <Link href="/legal" className="text-sm font-light">
            Rechtliches
          </Link>
        </footer>
        <script
          defer
          src="https://umami.app.niklas.services/script.js"
          data-website-id="7538dcdd-2bff-4310-8b80-73c666f2d90a"
        />
      </body>
    </html>
  );
}
