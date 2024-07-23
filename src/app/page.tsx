import React from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { Button } from "@waslaeuftin/components/ui/button";

const languages = [
  {
    code: "de",
    name: "Deutschland",
    flag: "🇩🇪",
    url: "https://waslaeuft.in/de/",
  },
  {
    code: "uk",
    name: "England (UK)",
    flag: "🇬🇧",
    url: "https://whatsshowing.in/uk/",
  },
  {
    code: "ie",
    name: "Ireland",
    flag: "🇮🇪",
    url: "https://whatsshowing.in/ie/",
  },
];

const LanguageSelectionPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 flex items-center justify-center">
          <Globe className="h-12 w-12 text-blue-500" />
          <h1 className="ml-2 text-2xl font-bold">Select Your Country</h1>
        </div>
        <div className="flex flex-col space-y-4">
          {languages.map((lang) => (
            <Link key={lang.code} href={lang.url} className="w-full">
              <Button
                variant="outline"
                className="flex w-full items-center justify-between px-6 py-4 text-lg transition-colors hover:bg-gray-50"
              >
                <span className="flex items-center">
                  <span className="mr-4 text-2xl">{lang.flag}</span>
                  {lang.name}
                </span>
                <span className="text-gray-400">→</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionPage;
