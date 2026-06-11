import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { CinemaCard } from "@waslaeuftin/expo/components/cinema-card";
import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { trpc } from "@waslaeuftin/expo/utils/api";

export default function CityScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { citySlug } = useLocalSearchParams<{ citySlug: string }>();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch movies and showings for the city
  const cityQuery = useQuery(
    trpc.cities.getCityMoviesAndShowingsBySlug.queryOptions({
      slug: citySlug,
      date: selectedDate,
    }),
  );

  // Set the screen title to the city name dynamically
  useEffect(() => {
    if (cityQuery.data?.name) {
      navigation.setOptions({
        title: `${cityQuery.data.name}`,
      });
    }
  }, [cityQuery.data, navigation]);

  const handleCinemaPress = (cinemaSlug: string) => {
    router.push(`/cinema/${cinemaSlug}`);
  };

  const isLoading = cityQuery.isLoading;

  return (
    <View className="bg-background flex-1">
      {/* Date Picker Bar */}
      <DatePickerBar selectedDate={selectedDate} onChange={setSelectedDate} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c03484" size="large" />
        </View>
      ) : cityQuery.data?.cinemas && cityQuery.data.cinemas.length > 0 ? (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={cityQuery.data.cinemas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <CinemaCard
              cinema={item}
              onCinemaPress={() => handleCinemaPress(item.slug)}
            />
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-foreground text-base font-semibold">
            Keine Kinos gefunden
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-xs">
            In dieser Stadt wurden aktuell keine Kinos oder Vorstellungen
            eingepflegt.
          </Text>
        </View>
      )}
    </View>
  );
}
