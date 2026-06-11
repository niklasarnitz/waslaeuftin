import { Octokit } from "octokit";

import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/api/internal/trpc";
import { RequestCinemaSchema } from "@waslaeuftin/validators";

export const githubRouter = createTRPCRouter({
  requestMovie: publicProcedure
    .input(RequestCinemaSchema)
    .mutation(async ({ input }) => {
      if (process.env.GITHUB_TOKEN) {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        const response = await octokit.rest.issues.create({
          owner: "niklasarnitz",
          repo: "waslaeuftin",
          title: `Kino Request: ${input.cinemaName} in ${input.city}`,
          body: `- Kino Name: ${input.cinemaName}\n- Stadt: ${input.city}\n- Homepage: ${input.cinemaHomepageUrl}\n- Datum: ${new Date().toISOString()}`,
          labels: ["Kino Wunsch"],
        });

        return {
          number: response.data.number,
          url: response.data.html_url,
        };
      }

      return null;
    }),
});
