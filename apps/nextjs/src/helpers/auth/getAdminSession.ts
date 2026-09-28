import { getServerSession } from "next-auth";

import {
  authOptions,
  isAdminAuthConfigured,
} from "@waslaeuftin/helpers/auth/authOptions";

/** The signed-in Authentik user, or null when not signed in / not configured. */
export const getAdminSession = async () => {
  if (!isAdminAuthConfigured()) return null;
  return getServerSession(authOptions);
};
