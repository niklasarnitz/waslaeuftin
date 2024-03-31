"use client";

import { Button } from "@waslaeuftin/components/ui/button";
import { signOut } from "next-auth/react";

export default function Admin() {
  return (
    <div>
      Admin
      <div>
        <Button onClick={() => signOut()}>Logout</Button>
      </div>
    </div>
  );
}
