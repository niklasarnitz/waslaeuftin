import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { UpcomingMovieCardData } from "@waslaeuftin/expo/components/upcoming-movie-card";
import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { formatReleaseDate } from "@waslaeuftin/expo/components/upcoming-movie-card";
import { useTrackMobileScreen } from "@waslaeuftin/expo/utils/analytics";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";
import { useReminders } from "@waslaeuftin/expo/utils/use-reminders";

interface UpcomingMovieDetailData extends UpcomingMovieCardData {
  posterPath: string | null;
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseMovieParam(movieParam: string | string[] | undefined) {
  const rawMovie = getFirstParam(movieParam);
  if (!rawMovie) return null;

  try {
    return JSON.parse(rawMovie) as UpcomingMovieDetailData;
  } catch (err) {
    console.error("Failed to parse upcoming movie detail params", err);
    return null;
  }
}

export default function UpcomingMovieDetailScreen() {
  const navigation = useNavigation();
  const primaryColor = usePrimaryColor();
  useTrackMobileScreen("movie");
  const params = useLocalSearchParams<{
    movie?: string | string[];
    tmdbMovieId?: string | string[];
  }>();
  const movie = React.useMemo(
    () => parseMovieParam(params.movie),
    [params.movie],
  );
  const { isReminded, toggle } = useReminders();

  useEffect(() => {
    navigation.setOptions({
      title: movie?.title ?? "Film",
      headerLargeTitle: false,
    });
  }, [movie?.title, navigation]);

  if (!movie) {
    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-base font-semibold">
          Film konnte nicht geöffnet werden
        </Text>
        <Text className="text-muted-foreground mt-1 text-center text-xs">
          Öffne den Film bitte erneut aus der Liste.
        </Text>
      </View>
    );
  }

  const releaseLabel = formatReleaseDate(movie.releaseDate);
  const reminded = isReminded(movie.tmdbMovieId);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background flex-1"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View
        className="bg-card border-border/40 gap-4 rounded-2xl border p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <View className="flex-row gap-4">
          <MoviePoster coverUrl={movie.posterUrl} size="lg" />
          <View className="min-w-0 flex-1 gap-2">
            <Text className="text-foreground text-2xl leading-tight font-bold tracking-tight">
              {movie.title}
            </Text>
            {releaseLabel ? (
              <Text className="text-muted-foreground text-xs font-medium">
                Kinostart: {releaseLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="bg-border/40 h-[1px]" />

        <Pressable
          onPress={() =>
            toggle({
              tmdbMovieId: movie.tmdbMovieId,
              title: movie.title,
              posterPath: movie.posterPath,
            })
          }
          className={`flex-row items-center gap-1.5 self-start rounded-lg px-3 py-1.5 ${
            reminded ? "bg-primary" : "bg-primary/10"
          }`}
        >
          <Ionicons
            name={reminded ? "notifications" : "notifications-outline"}
            size={14}
            color={reminded ? "#fff" : primaryColor}
          />
          <Text
            className={`text-xs font-bold ${
              reminded ? "text-white" : "text-primary"
            }`}
          >
            {reminded ? "Erinnerung aktiv" : "Erinnern"}
          </Text>
        </Pressable>

        {movie.overview ? (
          <View className="gap-1">
            <Text className="text-foreground text-sm font-bold tracking-tight">
              Beschreibung
            </Text>
            <Text className="text-muted-foreground text-sm leading-relaxed">
              {movie.overview}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
