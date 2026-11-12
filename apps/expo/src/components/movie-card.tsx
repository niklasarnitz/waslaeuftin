import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { ListingMovieCard as GroupedMovie } from "@waslaeuftin/core";
import { AppIcon } from "@waslaeuftin/expo/components/app-icon";
import { CinemaShowingsCard } from "@waslaeuftin/expo/components/cinema-showings-card";
import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { openExternalUrl } from "@waslaeuftin/expo/utils/open-url";

interface MovieCardProps {
  movie: GroupedMovie;
  hideCinemaHeader?: boolean;
  cinemaLimit?: number;
  showDetailsLink?: boolean;
}

export function MovieCard({
  movie,
  hideCinemaHeader = false,
  cinemaLimit = 3,
  showDetailsLink = true,
}: MovieCardProps) {
  const router = useRouter();
  const visibleCinemas = movie.cinemas.slice(0, cinemaLimit);
  const hiddenCinemaCount = movie.cinemas.length - visibleCinemas.length;

  const formatCinemaCount = (n: number) => {
    if (n === 1) return "Ein";
    if (n === 2) return "Zwei";
    if (n === 3) return "Drei";
    return `${n}`;
  };

  const openMovieDetail = () => {
    if (!showDetailsLink) return;

    router.push({
      pathname: "/movie/[movieName]",
      params: {
        movieName: movie.name,
        movie: JSON.stringify(movie),
      },
    });
  };

  const meta = movie.tmdbMetadata;
  const tmdbId = meta?.tmdbId;
  const tmdbMovieUrl = tmdbId
    ? `https://www.themoviedb.org/movie/${tmdbId}`
    : null;

  return (
    <View
      className="bg-card mb-4 rounded-3xl p-4"
      style={{ borderCurve: "continuous" }}
    >
      {/* Keep the poster beside the title, not beside the entire programme. */}
      <View className="flex-row gap-3">
        <Pressable
          onPress={openMovieDetail}
          disabled={!showDetailsLink}
          accessibilityRole={showDetailsLink ? "button" : undefined}
          accessibilityLabel={movie.name}
        >
          <MoviePoster coverUrl={movie.coverUrl} />
        </Pressable>

        {/* Title, metadata and secondary actions */}
        <View className="min-w-0 flex-1">
          {/* Title */}
          <Pressable
            onPress={openMovieDetail}
            disabled={!showDetailsLink}
            accessibilityRole={showDetailsLink ? "button" : undefined}
            className="active:opacity-70"
          >
            <Text
              className="text-foreground text-xl leading-tight font-bold tracking-tight"
              numberOfLines={3}
            >
              {movie.name}
            </Text>
          </Pressable>

          {/* Meta row */}
          <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
            <View className="bg-primary/10 rounded-full px-2 py-0.5">
              <Text className="text-primary text-[10px] font-semibold">
                {movie.showingsCount}{" "}
                {movie.showingsCount === 1 ? "Vorstellung" : "Vorstellungen"}
              </Text>
            </View>
            {movie.cinemas.length > 0 && !hideCinemaHeader && (
              <View className="bg-primary/10 rounded-full px-2 py-0.5">
                <Text className="text-primary text-[10px] font-semibold">
                  {movie.cinemas.length}{" "}
                  {movie.cinemas.length === 1 ? "Kino" : "Kinos"}
                </Text>
              </View>
            )}
            {meta?.certification && (
              <View className="bg-muted border-border rounded-full border px-2 py-0.5">
                <Text className="text-muted-foreground text-[10px] font-bold uppercase">
                  FSK {meta.certification}
                </Text>
              </View>
            )}
            {meta?.voteAverage ? (
              <View className="flex-row items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">
                <AppIcon name="star.fill" color="#F59E0B" size={10} />
                <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {meta.voteAverage.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {meta?.trailerUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Trailer zu ${movie.name} ansehen`}
                onPress={() =>
                  meta.trailerUrl && void openExternalUrl(meta.trailerUrl)
                }
                style={{ minHeight: 44 }}
                className="justify-center active:opacity-70"
              >
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    minHeight: 30,
                  }}
                  className="bg-action flex-row items-center gap-1 rounded-full"
                >
                  <AppIcon name="play" color="#FFF" size={12} />
                  <Text className="text-xs font-semibold text-white">
                    Trailer
                  </Text>
                </View>
              </Pressable>
            ) : null}
            {tmdbMovieUrl ? (
              <Pressable
                onPress={() => void openExternalUrl(tmdbMovieUrl)}
                accessibilityRole="button"
                accessibilityLabel={`${movie.name} auf TMDB öffnen`}
                style={{ minHeight: 44 }}
                className="justify-center active:opacity-70"
              >
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    minHeight: 30,
                  }}
                  className="bg-muted flex-row items-center gap-1 rounded-full"
                >
                  <AppIcon name="film" size={12} color="#8E8E93" />
                  <Text className="text-foreground text-xs font-semibold">
                    TMDB
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Full-width showtimes remain readable at larger text sizes. */}
      <View className="mt-3 gap-2.5">
        {visibleCinemas.map((cinemaEntry, cIdx) => {
          const { cinema, showings } = cinemaEntry;
          return (
            <CinemaShowingsCard
              key={`${cinema.slug}-${cIdx}`}
              cinema={cinema}
              showings={showings}
              hideCinemaHeader={hideCinemaHeader}
              movieName={movie.name}
              onCinemaPress={() =>
                router.push({
                  pathname: "/cinema/[cinemaSlug]",
                  params: { cinemaSlug: cinema.slug, name: cinema.name },
                })
              }
            />
          );
        })}
        {hiddenCinemaCount > 0 && showDetailsLink && (
          <Pressable
            onPress={openMovieDetail}
            accessibilityRole="button"
            className="bg-primary/10 justify-center rounded-2xl p-2.5 active:opacity-70"
            style={{ borderCurve: "continuous", minHeight: 44 }}
          >
            <Text className="text-primary text-center text-sm font-bold">
              {formatCinemaCount(hiddenCinemaCount)} weitere{" "}
              {hiddenCinemaCount === 1 ? "Kino" : "Kinos"} anzeigen
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
