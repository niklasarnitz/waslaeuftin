import type React from "react";
import { locales } from "../../i18n/settings";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return children;
}
