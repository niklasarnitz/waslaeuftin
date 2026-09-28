import NextAuth from "next-auth";

import { authOptions } from "@waslaeuftin/helpers/auth/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
