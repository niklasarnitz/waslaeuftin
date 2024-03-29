import { env } from "@waslaeuftin/env";
import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { RequestCinemaSchema } from "@waslaeuftin/types/RequestCinemaFormData";
import { Octokit } from "octokit";

export const githubRouter = createTRPCRouter({
  requestMovie: publicProcedure
    .input(RequestCinemaSchema)
    .mutation(async ({ input }) => {
      if (env.GITHUB_TOKEN) {
        const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

        return await octokit.rest.issues.create({
          owner: "niklasarnitz",
          repo: "waslaeuftin",
          title: `Kino Request: ${input.cinemaName} in ${input.city}`,
          body: `- Kino Name: ${input.cinemaName}\n- Stadt: ${input.city}\n- Homepage: ${input.cinemaHomepageUrl}\n- Datum: ${new Date().toISOString()}`,
          labels: ["Kino Wunsch"],
        });
      }
    }),
});
