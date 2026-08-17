import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

export const formatReleaseDate = (releaseDate: string | null) => {
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
      className="bg-card border-border/40 mb-3 flex-row gap-3 rounded-2xl border p-3"
      style={{ borderCurve: "continuous" }}
    >
      <MoviePoster coverUrl={movie.posterUrl} size="md" />
      <View className="min-w-0 flex-1 justify-between gap-2">
        <View className="gap-1">
          <Text
            className="text-foreground text-base font-bold tracking-tight"
            numberOfLines={2}
          >
            {movie.title}
          </Text>
          {releaseLabel ? (
            <Text className="text-muted-foreground text-xs font-medium">
              Kinostart: {releaseLabel}
            </Text>
          ) : null}
          {movie.overview ? (
            <Text className="text-muted-foreground text-xs" numberOfLines={3}>
              {movie.overview}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onToggleReminder}
            hitSlop={8}
            className={`flex-row items-center gap-1.5 rounded-lg px-3 py-1.5 ${
              isReminded ? "bg-primary" : "bg-primary/10"
            }`}
          >
            <Ionicons
              name={isReminded ? "notifications" : "notifications-outline"}
              size={14}
              color={isReminded ? "#fff" : primaryColor}
            />
            <Text
              className={`text-xs font-bold ${
                isReminded ? "text-white" : "text-primary"
              }`}
            >
              {isReminded ? "Erinnerung aktiv" : "Erinnern"}
            </Text>
          </Pressable>

          <Pressable
            onPress={openTmdb}
            className="bg-muted border-border/60 active:bg-muted/80 flex-row items-center gap-1 rounded-lg border px-2.5 py-1.5"
          >
            <Ionicons name="film-outline" size={12} className="text-foreground" />
            <Text className="text-foreground text-xs font-semibold">TMDB</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
