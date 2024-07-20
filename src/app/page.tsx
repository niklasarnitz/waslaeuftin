import { Button } from "@waslaeuftin/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div>
      <Link href="https://waslaeuft.in/de/">
        <Button>🇩🇪</Button>
      </Link>
      <Link href="https://whatsshowing.in/uk/">
        <Button>🇬🇧</Button>
      </Link>
      <Link href="https://whatsshowing.in/ie/">
        <Button>🇮🇪</Button>
      </Link>
    </div>
  );
}
