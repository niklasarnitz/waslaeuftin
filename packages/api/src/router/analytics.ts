import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/api/internal/trpc";
import { trackMobileEvent } from "@waslaeuftin/api/internal/umami";
import { MobileAnalyticsEventInputSchema } from "@waslaeuftin/validators";

export const analyticsRouter = createTRPCRouter({
  trackMobileEvent: publicProcedure
    .input(MobileAnalyticsEventInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.headers.get("x-trpc-source") !== "expo-react") {
        return { ok: true };
      }

      await trackMobileEvent(input);
      return { ok: true };
    }),
});
