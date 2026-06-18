import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
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
  const primaryColor = usePrimaryColor();
  const releaseLabel = formatReleaseDate(movie.releaseDate);

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

        <Pressable
          onPress={onToggleReminder}
          hitSlop={8}
          className={`flex-row items-center gap-1.5 self-start rounded-lg px-3 py-1.5 ${
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
      </View>
    </Pressable>
  );
}
