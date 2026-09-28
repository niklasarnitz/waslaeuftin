import type { NextAuthOptions } from "next-auth";
import AuthentikProvider from "next-auth/providers/authentik";

import { env } from "@waslaeuftin/env";

// /admin is protected by the Authentik instance. Everyone who can sign in
// there (i.e. who has access to the Authentik application) is an admin, so
// access is managed entirely in Authentik. Without the AUTHENTIK_* variables
// the admin area is disabled.
export const isAdminAuthConfigured = () =>
  !!(
    env.AUTHENTIK_ISSUER &&
    env.AUTHENTIK_CLIENT_ID &&
    env.AUTHENTIK_CLIENT_SECRET &&
    env.AUTH_SECRET
  );

export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  providers: isAdminAuthConfigured()
    ? [
        AuthentikProvider({
          clientId: env.AUTHENTIK_CLIENT_ID!,
          clientSecret: env.AUTHENTIK_CLIENT_SECRET!,
          // The provider appends /.well-known/openid-configuration itself.
          issuer: env.AUTHENTIK_ISSUER!.replace(/\/+$/, ""),
        }),
      ]
    : [],
  pages: {
    // Use the admin page's own sign-in screen instead of the NextAuth one.
    signIn: "/admin",
    error: "/admin",
  },
};
