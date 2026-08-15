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
  let certification =
    deRelease?.release_dates.find((d) => d.certification)?.certification ??
    null;

  if (!certification) {
    const usRelease = releaseResults.find((r) => r.iso_3166_1 === "US");
    certification =
      usRelease?.release_dates.find((d) => d.certification)?.certification ??
      null;
  }

  // Extract directors, cast, crew
  const directors =
    details.credits?.crew
      ?.filter((c) => c.job === "Director")
      ?.map((d) => ({
        id: d.id,
        name: d.name,
        profilePath: d.profile_path ?? null,
      })) ?? [];

  const cast =
    details.credits?.cast?.slice(0, 15)?.map((a) => ({
      id: a.id,
      name: a.name,
      character: a.character ?? null,
      profilePath: a.profile_path ?? null,
    })) ?? [];

  const crew =
    details.credits?.crew
      ?.filter((c) =>
        [
          "Producer",
          "Executive Producer",
          "Writer",
          "Screenplay",
          "Original Music Composer",
          "Director of Photography",
        ].includes(c.job),
      )
      ?.slice(0, 15)
      ?.map((c) => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profilePath: c.profile_path ?? null,
      })) ?? [];

  // Extract production companies, countries, languages, collection, keywords
  const productionCompanies =
    details.production_companies?.map((p) => ({
      id: p.id,
      name: p.name,
      logoPath: p.logo_path ?? null,
      originCountry: p.origin_country,
    })) ?? [];

  const productionCountries =
    details.production_countries?.map((p) => ({
      iso_3166_1: p.iso_3166_1,
      name: p.name,
    })) ?? [];

  const spokenLanguages =
    details.spoken_languages?.map((s) => ({
      iso_639_1: s.iso_639_1,
      name: s.name,
      englishName: s.english_name ?? null,
    })) ?? [];

  const collectionJson = details.belongs_to_collection
    ? {
        id: details.belongs_to_collection.id,
        name: details.belongs_to_collection.name,
        posterPath: details.belongs_to_collection.poster_path ?? null,
        backdropPath: details.belongs_to_collection.backdrop_path ?? null,
      }
    : null;

  const rawKeywords = details.keywords?.keywords ?? details.keywords?.results ?? [];
  const keywordsJson = rawKeywords.map((k) => ({
    id: k.id,
    name: k.name,
  }));

  const payloadData = {
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
    rawDetails: details as unknown as object,
    directors: directors.length > 0 ? directors : undefined,
    cast: cast.length > 0 ? cast : undefined,
    crew: crew.length > 0 ? crew : undefined,
    productionCompanies:
      productionCompanies.length > 0 ? productionCompanies : undefined,
    productionCountries:
      productionCountries.length > 0 ? productionCountries : undefined,
    spokenLanguages: spokenLanguages.length > 0 ? spokenLanguages : undefined,
    collectionJson: collectionJson ?? undefined,
    keywordsJson: keywordsJson.length > 0 ? keywordsJson : undefined,
  };

  await db.tmdbMetadata.upsert({
    where: { tmdbId: details.id },
    create: payloadData,
    update: payloadData,
  });
};

