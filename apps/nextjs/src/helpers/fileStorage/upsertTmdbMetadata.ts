import { db } from "@waslaeuftin/db/client";
import { TmdbMovieDetailsResponse } from "@waslaeuftin/types/TmdbMovieDetailsResponse";

export const upsertTmdbMetadata = async (details: TmdbMovieDetailsResponse) => {
  const genresString = details.genres.map((g) => g.name).join(", ");
  const budget = BigInt(details.budget);
  const revenue = BigInt(details.revenue);

  // Extract trailer URL
  const videoResults = details.videos?.results ?? [];
  const trailerVideo =
    videoResults.find((v) => v.type === "Trailer" && v.official) ??
    videoResults.find((v) => v.type === "Trailer") ??
    videoResults.find((v) => v.site === "YouTube" || v.site === "Vimeo");

  let trailerUrl: string | null = null;
  if (trailerVideo) {
    if (trailerVideo.site === "YouTube") {
      trailerUrl = `https://www.youtube.com/watch?v=${trailerVideo.key}`;
    } else if (trailerVideo.site === "Vimeo") {
      trailerUrl = `https://vimeo.com/${trailerVideo.key}`;
    }
  }

  // Extract age rating certification (DE first, then fallback to US)
  const releaseResults = details.release_dates?.results ?? [];
  const deRelease = releaseResults.find((r) => r.iso_3166_1 === "DE");
  let certification = deRelease?.release_dates.find((d) => d.certification)?.certification ?? null;

  if (!certification) {
    const usRelease = releaseResults.find((r) => r.iso_3166_1 === "US");
    certification = usRelease?.release_dates.find((d) => d.certification)?.certification ?? null;
  }

  await db.tmdbMetadata.upsert({
    where: { tmdbId: details.id },
    create: {
      tmdbId: details.id,
      title: details.title,
      originalTitle: details.original_title,
      originalLanguage: details.original_language,
      overview: details.overview,
      tagline: details.tagline,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      releaseDate: details.release_date,
      runtime: details.runtime,
      budget,
      revenue,
      popularity: details.popularity,
      voteAverage: details.vote_average,
      voteCount: details.vote_count,
      status: details.status,
      adult: details.adult,
      video: details.video,
      homepage: details.homepage,
      imdbId: details.imdb_id,
      genres: genresString,
      certification,
      trailerUrl,
    },
    update: {
      title: details.title,
      originalTitle: details.original_title,
      originalLanguage: details.original_language,
      overview: details.overview,
      tagline: details.tagline,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      releaseDate: details.release_date,
      runtime: details.runtime,
      budget,
      revenue,
      popularity: details.popularity,
      voteAverage: details.vote_average,
      voteCount: details.vote_count,
      status: details.status,
      adult: details.adult,
      video: details.video,
      homepage: details.homepage,
      imdbId: details.imdb_id,
      genres: genresString,
      certification,
      trailerUrl,
    },
  });
};
