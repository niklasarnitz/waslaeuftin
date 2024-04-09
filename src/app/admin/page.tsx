"use client";

import { Button } from "@waslaeuftin/components/ui/button";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function Admin() {
  return (
    <div>
      Admin
      <div className="flex flex-row space-x-4">
        <Link href="/admin/cities">
          <Button>Cities</Button>
        </Link>
        <Button onClick={() => signOut()}>Logout</Button>
      </div>
    </div>
  );
}
