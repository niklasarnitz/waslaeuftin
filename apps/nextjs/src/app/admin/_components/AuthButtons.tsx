"use client";

import { signIn, signOut } from "next-auth/react";

import { Button } from "@waslaeuftin/components/ui/button";

export const SignInButton = () => (
  <Button onClick={() => void signIn("authentik", { callbackUrl: "/admin" })}>
    Sign in with Authentik
  </Button>
);

export const SignOutButton = () => (
  <Button
    size="sm"
    variant="ghost"
    onClick={() => void signOut({ callbackUrl: "/" })}
  >
    Sign out
  </Button>
);
