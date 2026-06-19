import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { GroupedMovie } from "@waslaeuftin/expo/utils/group-movies";
import { CinemaShowingsCard } from "@waslaeuftin/expo/components/cinema-showings-card";
import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";

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

  return (
    <View
      className="bg-card border-border/40 mb-4 rounded-2xl border p-4 shadow-sm"
      style={{ borderCurve: "continuous" }}
    >
      {/* Two-column layout: cover | title + cinemas */}
      <View className="flex-row gap-3">
        {/* Left: Movie cover */}
        <Pressable onPress={openMovieDetail} disabled={!showDetailsLink}>
          <MoviePoster coverUrl={movie.coverUrl} />
        </Pressable>

        {/* Right: title + meta + cinemas */}
        <View className="min-w-0 flex-1">
          {/* Title */}
          <Pressable
            onPress={openMovieDetail}
            disabled={!showDetailsLink}
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
          </View>

          {/* Cinemas & showings */}
          <View className="mt-3 gap-2.5">
            {visibleCinemas.map((cinemaEntry, cIdx) => {
              const { cinema, showings } = cinemaEntry;
              return (
                <CinemaShowingsCard
                  key={`${cinema.slug}-${cIdx}`}
                  cinema={cinema}
                  showings={showings}
                  hideCinemaHeader={hideCinemaHeader}
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
                className="border-primary/40 bg-muted/40 active:bg-muted/60 rounded-xl border border-dashed p-2.5"
                style={{ borderCurve: "continuous" }}
              >
                <Text className="text-primary text-center text-sm font-bold">
                  {formatCinemaCount(hiddenCinemaCount)} weitere{" "}
                  {hiddenCinemaCount === 1 ? "Kino" : "Kinos"} anzeigen
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
