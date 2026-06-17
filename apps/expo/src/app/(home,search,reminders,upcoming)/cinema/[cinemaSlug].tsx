import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { MovieCard } from "@waslaeuftin/expo/components/movie-card";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { normalizeToStartOfDay } from "@waslaeuftin/expo/utils/date";
import { groupCinemasByMovie } from "@waslaeuftin/expo/utils/group-movies";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function CinemaScreen() {
  const navigation = useNavigation();
  const primaryColor = usePrimaryColor();
  const { cinemaSlug } = useLocalSearchParams<{ cinemaSlug: string }>();

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    normalizeToStartOfDay(new Date()),
  );

  const cinemaQuery = useQuery(
    trpc.cinemas.getCinemaBySlug.queryOptions({
      cinemaSlug,
      date: selectedDate,
    }),
  );

  const cinema = cinemaQuery.data;

  // Set title: immediately from the slug, then from real data
  useEffect(() => {
    const initial = cinemaSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    navigation.setOptions({ title: cinema?.name ?? initial });
  }, [cinema?.name, cinemaSlug, navigation]);

  const groupedMovies = React.useMemo(() => {
    return cinema ? groupCinemasByMovie([cinema]) : [];
  }, [cinema]);

  const isLoading = cinemaQuery.isLoading;

  return (
    <View className="bg-background flex-1">
      <DatePickerBar selectedDate={selectedDate} onChange={setSelectedDate} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : cinema ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {groupedMovies.length > 0 ? (
            groupedMovies.map((movie) => (
              <MovieCard
                key={movie.name}
                movie={movie}
                hideCinemaHeader={true}
              />
            ))
          ) : (
            <View className="items-center justify-center py-8">
              <Text className="text-muted-foreground text-sm italic">
                Keine Vorstellungen für dieses Datum gefunden.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-foreground text-base font-semibold">
            Kino nicht gefunden
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-xs">
            Das angeforderte Kino oder der Spielplan konnte nicht geladen
            werden.
          </Text>
        </View>
      )}
    </View>
  );
}
