import { getComtradaForumCinemasMovies } from "@waslaeuftin/helpers/comtrada/forum-cinemas/getComtradaForumCinemasMovies";

export const GET = async () => {
  const testData = await getComtradaForumCinemasMovies("forum_rastatt");

  return new Response(JSON.stringify(testData));
};
