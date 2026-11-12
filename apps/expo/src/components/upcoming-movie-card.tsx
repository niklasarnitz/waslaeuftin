import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppIcon } from "@waslaeuftin/expo/components/app-icon";
import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { openExternalUrl } from "@waslaeuftin/expo/utils/open-url";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export interface UpcomingMovieCardData {
  tmdbMovieId: number;
  title: string;
  posterUrl: string | null;
  releaseDate: string | null;
  overview: string | null;
}

interface UpcomingMovieCardProps {
  movie: UpcomingMovieCardData;
  isReminded: boolean;
  onToggleReminder: () => void;
  onPress?: () => void;
}

const formatReleaseDate = (releaseDate: string | null) => {
  if (!releaseDate) return null;
  const date = new Date(releaseDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export function UpcomingMovieCard({
  movie,
  isReminded,
  onToggleReminder,
  onPress,
}: UpcomingMovieCardProps) {
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const primaryColor = usePrimaryColor();
  const releaseLabel = formatReleaseDate(movie.releaseDate);

  const openTmdb = () => {
    void openExternalUrl(
      `https://www.themoviedb.org/movie/${movie.tmdbMovieId}`,
    );
  };

  return (
    <Pressable
      onPress={onPress}
      accessible={!!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className="bg-card mb-3 flex-row gap-3 rounded-3xl p-4"
      style={{ borderCurve: "continuous" }}
    >
      <MoviePoster coverUrl={movie.posterUrl} size="md" />
      <View className="min-w-0 flex-1 justify-between gap-2">
        <View className="gap-1">
          <Text
            className="text-foreground text-lg font-semibold"
            numberOfLines={2}
          >
            {movie.title}
          </Text>
          {releaseLabel ? (
            <Text className="text-muted-foreground text-sm">
              Kinostart: {releaseLabel}
            </Text>
          ) : null}
          {movie.overview ? (
            <Pressable
              onPress={() => setIsOverviewExpanded(!isOverviewExpanded)}
              accessibilityRole="button"
              accessibilityLabel={
                isOverviewExpanded
                  ? "Beschreibung einklappen"
                  : "Beschreibung erweitern"
              }
              accessibilityState={{ expanded: isOverviewExpanded }}
            >
              <Text
                className="text-muted-foreground text-sm"
                numberOfLines={isOverviewExpanded ? undefined : 3}
              >
                {movie.overview}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          <Pressable
            onPress={onToggleReminder}
            accessibilityRole="button"
            accessibilityLabel={`${movie.title}: ${isReminded ? "Erinnerung entfernen" : "An Film erinnern"}`}
            accessibilityState={{ selected: isReminded }}
            style={{ minHeight: 44 }}
            className="justify-center active:opacity-70"
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                minHeight: 30,
              }}
              className={`flex-row items-center gap-1.5 rounded-full ${
                isReminded ? "bg-action" : "bg-primary/10"
              }`}
            >
              <AppIcon
                name={isReminded ? "bell.fill" : "bell"}
                size={12}
                color={isReminded ? "#fff" : primaryColor}
              />
              <Text
                className={`text-xs font-semibold ${
                  isReminded ? "text-white" : "text-primary"
                }`}
              >
                {isReminded ? "Erinnerung aktiv" : "Erinnern"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={openTmdb}
            accessibilityRole="button"
            accessibilityLabel={`${movie.title} auf TMDB öffnen`}
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
              <AppIcon name="film" size={12} color={primaryColor} />
              <Text className="text-foreground text-xs font-semibold">
                TMDB
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
