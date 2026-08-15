import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@waslaeuftin/expo/utils/api";
import type { GroupedMovie } from "@waslaeuftin/expo/utils/group-movies";
import { CinemaShowingsCard } from "@waslaeuftin/expo/components/cinema-showings-card";
import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { useTrackMobileScreen } from "@waslaeuftin/expo/utils/analytics";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { openExternalUrl } from "@waslaeuftin/expo/utils/open-url";
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

  const meta = movie.tmdbMetadata;
  const activeTmdbId = meta?.tmdbId ?? (hasTmdbId ? tmdbMovieId : null);
  const tmdbMovieUrl = activeTmdbId
    ? `https://www.themoviedb.org/movie/${activeTmdbId}`
    : `https://www.themoviedb.org/search/movie?query=${encodeURIComponent(movie.name)}`;

  const openWebUrl = (url: string) => {
    void openExternalUrl(url);
  };

  const directors: Array<{ id: number; name: string }> = Array.isArray(
    meta?.directors,
  )
    ? meta.directors
    : [];

  const cast: Array<{ id: number; name: string; character?: string | null }> =
    Array.isArray(meta?.cast) ? meta.cast : [];

  const productionCompanies: Array<{ id: number; name: string }> =
    Array.isArray(meta?.productionCompanies) ? meta.productionCompanies : [];

  const keywords: Array<{ id: number; name: string }> = Array.isArray(
    meta?.keywordsJson,
  )
    ? meta.keywordsJson
    : [];

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
            {meta?.tagline ? (
              <Text className="text-muted-foreground italic text-xs">
                "{meta.tagline}"
              </Text>
            ) : null}

            {/* Badges */}
            <View className="flex-row flex-wrap gap-1.5">
              {meta?.certification && (
                <View className="bg-muted border-border rounded-full border px-2 py-0.5">
                  <Text className="text-muted-foreground text-[10px] font-bold uppercase">
                    FSK {meta.certification}
                  </Text>
                </View>
              )}
              {meta?.runtime ? (
                <View className="bg-muted border-border rounded-full border px-2 py-0.5">
                  <Text className="text-muted-foreground text-[10px] font-semibold">
                    {meta.runtime} Min.
                  </Text>
                </View>
              ) : null}
              {meta?.voteAverage ? (
                <View className="bg-amber-500/10 border-amber-500/30 flex-row items-center gap-1 rounded-full border px-2 py-0.5">
                  <Ionicons name="star" color="#F59E0B" size={10} />
                  <Text className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                    {meta.voteAverage.toFixed(1)}
                  </Text>
                </View>
              ) : null}
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

            {/* Action Buttons Row: Watch Trailer & Open MovieDB */}
            <View className="mt-2 flex-row flex-wrap gap-2">
              {meta?.trailerUrl && (
                <Pressable
                  onPress={() => meta.trailerUrl && openWebUrl(meta.trailerUrl)}
                  className="bg-primary flex-row items-center gap-1.5 rounded-xl px-3 py-2 active:opacity-80 shadow-sm"
                  style={{ borderCurve: "continuous" }}
                >
                  <Ionicons name="play" color="#FFF" size={14} />
                  <Text className="text-xs font-bold text-white">
                    Trailer ansehen
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => openWebUrl(tmdbMovieUrl)}
                className="bg-secondary/90 border-border/80 flex-row items-center gap-1.5 rounded-xl border px-3 py-2 active:opacity-80"
                style={{ borderCurve: "continuous" }}
              >
                <Ionicons name="film-outline" size={14} className="text-foreground" />
                <Text className="text-foreground text-xs font-semibold">
                  TMDB öffnen
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="bg-border/40 h-[1px]" />

        {/* Overview & Metadata Sections */}
        <View className="gap-3">
          {meta?.overview && (
            <View className="gap-1">
              <Text className="text-foreground text-sm font-bold tracking-tight">
                Beschreibung
              </Text>
              <Text className="text-muted-foreground text-sm leading-relaxed">
                {meta.overview}
              </Text>
            </View>
          )}

          {/* Directors */}
          {directors.length > 0 && (
            <View className="gap-1.5">
              <Text className="text-foreground text-xs font-bold tracking-tight">
                Regie
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {directors.map((d) => (
                  <Pressable
                    key={`dir-${d.id}`}
                    onPress={() =>
                      openWebUrl(`https://www.themoviedb.org/person/${d.id}`)
                    }
                    className="bg-muted border-border/60 active:bg-muted/80 rounded-lg border px-2.5 py-1"
                  >
                    <Text className="text-foreground text-xs font-medium">
                      {d.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <View className="gap-1.5">
              <Text className="text-foreground text-xs font-bold tracking-tight">
                Besetzung
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {cast.map((a) => (
                  <Pressable
                    key={`cast-${a.id}`}
                    onPress={() =>
                      openWebUrl(`https://www.themoviedb.org/person/${a.id}`)
                    }
                    className="bg-muted border-border/60 active:bg-muted/80 rounded-lg border px-2.5 py-1"
                  >
                    <Text className="text-foreground text-xs font-medium">
                      {a.name}
                      {a.character ? ` (${a.character})` : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Production Companies / Studios */}
          {productionCompanies.length > 0 && (
            <View className="gap-1.5">
              <Text className="text-foreground text-xs font-bold tracking-tight">
                Studio / Produktion
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {productionCompanies.map((studio) => (
                  <Pressable
                    key={`studio-${studio.id}`}
                    onPress={() =>
                      openWebUrl(
                        `https://www.themoviedb.org/company/${studio.id}`,
                      )
                    }
                    className="bg-muted border-border/60 active:bg-muted/80 rounded-lg border px-2.5 py-1"
                  >
                    <Text className="text-foreground text-xs font-medium">
                      {studio.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <View className="gap-1.5">
              <Text className="text-foreground text-xs font-bold tracking-tight">
                Stichwörter
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <Pressable
                    key={`kw-${kw.id}`}
                    onPress={() =>
                      openWebUrl(
                        `https://www.themoviedb.org/keyword/${kw.id}`,
                      )
                    }
                    className="bg-muted/50 border-border/40 rounded-full border px-2 py-0.5"
                  >
                    <Text className="text-muted-foreground text-[10px] font-medium">
                      #{kw.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Showings per Cinema */}
      <View className="gap-3">
        <Text className="text-foreground text-lg font-bold tracking-tight">
          Kinos & Vorstellungen
        </Text>
        {movie.cinemas.map(({ cinema, showings }, index) => (
          <CinemaShowingsCard
            key={`${cinema.slug}-${index}`}
            cinema={cinema}
            showings={showings}
            movieName={movie.name}
            onCinemaPress={() =>
              router.push({
                pathname: "/cinema/[cinemaSlug]",
                params: { cinemaSlug: cinema.slug, name: cinema.name },
              })
            }
          />
        ))}
      </View>
    </ScrollView>
  );
}
