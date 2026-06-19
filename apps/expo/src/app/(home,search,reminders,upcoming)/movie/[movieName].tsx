import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@waslaeuftin/expo/utils/api";
import type { GroupedMovie } from "@waslaeuftin/expo/utils/group-movies";
import { CinemaShowingsCard } from "@waslaeuftin/expo/components/cinema-showings-card";
import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { useTrackMobileScreen } from "@waslaeuftin/expo/utils/analytics";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { useLocationStore } from "@waslaeuftin/expo/utils/location";
import { useRefresh } from "@waslaeuftin/expo/utils/refresh";
import { useSettingsStore } from "@waslaeuftin/expo/utils/settings";
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

type NearbyMovie = NonNullable<
  RouterOutputs["cinemas"]["getNearbyCinemasForMovie"]
>;

// Normalize the server `getNearbyCinemasForMovie` result into the same
// `GroupedMovie` shape the JSON-param path produces.
function toGroupedMovie(data: NearbyMovie): GroupedMovie {
  return {
    name: data.name,
    coverUrl: data.coverUrl,
    showingsCount: data.showingsCount,
    nextShowingDate: data.nextShowingDate,
    tmdbMetadata: data.tmdbMetadata,
    cinemas: data.cinemas.map(({ cinema, showings }) => ({
      cinema: {
        id: cinema.id,
        name: cinema.name,
        slug: cinema.slug,
        distanceKm: cinema.distanceKm,
        city: cinema.city,
      },
      showings: showings.map((showing) => ({
        id: showing.id,
        dateTime: showing.dateTime,
        bookingUrl: showing.bookingUrl,
        showingAdditionalData: showing.showingAdditionalData,
      })),
    })),
  };
}

export default function MovieDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const primaryColor = usePrimaryColor();
  const { refreshing, onRefresh } = useRefresh();
  useTrackMobileScreen("movie");
  const params = useLocalSearchParams<{
    movie?: string | string[];
    movieName?: string | string[];
    tmdbMovieId?: string | string[];
  }>();
  const paramMovie = React.useMemo(
    () => parseMovieParam(params.movie),
    [params.movie],
  );
  const fallbackTitle = getFirstParam(params.movieName) ?? "Film";
  const tmdbMovieId = Number(getFirstParam(params.tmdbMovieId));
  const hasTmdbId = Number.isFinite(tmdbMovieId) && tmdbMovieId > 0;
  const cachedCoords = useLocationStore((state) => state.cachedCoords);
  const searchRadiusKm = useSettingsStore((state) => state.searchRadiusKm);

  // Deep-link path (notification tap / Erinnerungen): fetch the movie's nearby
  // cinemas by its TMDB id when we weren't handed a serialized movie.
  const shouldFetch = !paramMovie && hasTmdbId && !!cachedCoords;
  const nearbyQuery = useQuery(
    trpc.cinemas.getNearbyCinemasForMovie.queryOptions(
      {
        latitude: cachedCoords?.latitude ?? 0,
        longitude: cachedCoords?.longitude ?? 0,
        maxDistanceKm: searchRadiusKm,
        tmdbMovieId: hasTmdbId ? tmdbMovieId : 1,
      },
      { enabled: shouldFetch },
    ),
  );

  const movie =
    paramMovie ?? (nearbyQuery.data ? toGroupedMovie(nearbyQuery.data) : null);

  useEffect(() => {
    navigation.setOptions({
      title: movie?.name ?? fallbackTitle,
      headerLargeTitle: false,
    });
  }, [fallbackTitle, movie?.name, navigation]);

  if (!movie) {
    if (shouldFetch && nearbyQuery.isLoading) {
      return (
        <View className="bg-background flex-1 items-center justify-center p-6">
          <ActivityIndicator color={primaryColor} size="small" />
          <Text className="text-muted-foreground mt-2 text-xs font-medium">
            Suche Kinos in deiner Nähe...
          </Text>
        </View>
      );
    }

    return (
      <View className="bg-background flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-base font-semibold">
          {hasTmdbId
            ? "Aktuell keine Vorstellungen in deiner Nähe"
            : "Film konnte nicht geöffnet werden"}
        </Text>
        <Text className="text-muted-foreground mt-1 text-center text-xs">
          {hasTmdbId
            ? "Dieser Film läuft derzeit in keinem Kino in deiner Nähe."
            : "Öffne den Film bitte erneut aus der Filmliste."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background flex-1"
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={primaryColor}
        />
      }
    >
      <View
        className="bg-card border-border/40 gap-4 rounded-2xl border p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <View className="flex-row gap-4">
          <MoviePoster coverUrl={movie.coverUrl} size="lg" />
          <View className="min-w-0 flex-1 gap-2">
            <Text className="text-foreground text-2xl leading-tight font-bold tracking-tight">
              {movie.name}
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {movie.tmdbMetadata?.certification && (
                <View className="bg-muted border-border rounded-full border px-2 py-0.5">
                  <Text className="text-muted-foreground text-[10px] font-bold uppercase">
                    FSK {movie.tmdbMetadata.certification}
                  </Text>
                </View>
              )}
              <View className="bg-primary/10 rounded-full px-2 py-0.5">
                <Text className="text-primary text-[10px] font-semibold">
                  {movie.showingsCount}{" "}
                  {movie.showingsCount === 1 ? "Vorstellung" : "Vorstellungen"}
                </Text>
              </View>
              <View className="bg-primary/10 rounded-full px-2 py-0.5">
                <Text className="text-primary text-[10px] font-semibold">
                  {movie.cinemas.length}{" "}
                  {movie.cinemas.length === 1 ? "Kino" : "Kinos"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {(movie.tmdbMetadata?.overview || movie.tmdbMetadata?.trailerUrl) && (
          <>
            <View className="bg-border/40 h-[1px]" />
            <View className="gap-3">
              {movie.tmdbMetadata?.trailerUrl && (
                <View className="flex-row">
                  <Pressable
                    onPress={() =>
                      movie.tmdbMetadata?.trailerUrl &&
                      Linking.openURL(movie.tmdbMetadata.trailerUrl)
                    }
                    className="bg-primary flex-row items-center gap-1.5 rounded-xl px-3 py-1.5 active:opacity-80"
                    style={{ borderCurve: "continuous" }}
                  >
                    <Ionicons name="play" color="#FFF" size={12} />
                    <Text className="text-xs font-bold text-white">
                      Trailer ansehen
                    </Text>
                  </Pressable>
                </View>
              )}
              {movie.tmdbMetadata?.overview && (
                <View className="gap-1">
                  <Text className="text-foreground text-sm font-bold tracking-tight">
                    Beschreibung
                  </Text>
                  <Text className="text-muted-foreground text-sm leading-relaxed">
                    {movie.tmdbMetadata.overview}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
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
