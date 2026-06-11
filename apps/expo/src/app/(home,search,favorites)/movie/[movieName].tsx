import React, { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import type { GroupedMovie } from "@waslaeuftin/expo/utils/group-movies";
import { CinemaShowingsCard } from "@waslaeuftin/expo/components/cinema-showings-card";
import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseMovieParam(movieParam: string | string[] | undefined) {
  const rawMovie = getFirstParam(movieParam);
  if (!rawMovie) return null;

  try {
    return JSON.parse(rawMovie) as GroupedMovie;
  } catch (err) {
    console.error("Failed to parse movie detail params", err);
    return null;
  }
}

export default function MovieDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const primaryColor = usePrimaryColor();
  const primaryBg = `${primaryColor}1a`;
  const params = useLocalSearchParams<{
    movie?: string | string[];
    movieName?: string | string[];
  }>();
  const movie = React.useMemo(
    () => parseMovieParam(params.movie),
    [params.movie],
  );
  const fallbackTitle = getFirstParam(params.movieName) ?? "Film";

  useEffect(() => {
    navigation.setOptions({
      title: movie?.name ?? fallbackTitle,
      headerLargeTitle: false,
    });
  }, [fallbackTitle, movie?.name, navigation]);

  if (!movie) {
    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-base font-semibold">
          Film konnte nicht geöffnet werden
        </Text>
        <Text className="text-muted-foreground mt-1 text-center text-xs">
          Öffne den Film bitte erneut aus der Filmliste.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background flex-1"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View
        className="bg-card border-border/40 rounded-2xl border p-4"
        style={{
          borderCurve: "continuous",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        <View className="flex-row gap-4">
          <MoviePoster coverUrl={movie.coverUrl} size="lg" />
          <View className="min-w-0 flex-1 gap-2">
            <Text className="text-foreground text-2xl leading-tight font-bold tracking-tight">
              {movie.name}
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: primaryBg }}>
                <Text className="text-[10px] font-semibold" style={{ color: primaryColor }}>
                  {movie.showingsCount}{" "}
                  {movie.showingsCount === 1 ? "Vorstellung" : "Vorstellungen"}
                </Text>
              </View>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: primaryBg }}>
                <Text className="text-[10px] font-semibold" style={{ color: primaryColor }}>
                  {movie.cinemas.length}{" "}
                  {movie.cinemas.length === 1 ? "Kino" : "Kinos"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-3">
        <Text className="text-foreground text-lg font-bold tracking-tight">
          Kinos & Vorstellungen
        </Text>
        {movie.cinemas.map(({ cinema, showings }, index) => (
          <CinemaShowingsCard
            key={`${cinema.slug}-${index}`}
            cinema={cinema}
            showings={showings}
            onCinemaPress={() => router.push(`/cinema/${cinema.slug}`)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
