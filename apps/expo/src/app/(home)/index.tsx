import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useQuery } from "@tanstack/react-query";

import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { MovieCard } from "@waslaeuftin/expo/components/movie-card";
import { SearchModal } from "@waslaeuftin/expo/components/search-modal";
import {
  trackMobileEvent,
  useTrackMobileScreen,
} from "@waslaeuftin/expo/utils/analytics";
import { apiClient, queryClient, trpc } from "@waslaeuftin/expo/utils/api";
import {
  createScheduleDate,
  normalizeToStartOfDay,
} from "@waslaeuftin/expo/utils/date";
import { useDeviceStore } from "@waslaeuftin/expo/utils/device";
import { useLocationStore } from "@waslaeuftin/expo/utils/location";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

const POPULAR_CITIES = [
  { name: "Berlin", slug: "berlin" },
  { name: "München", slug: "muenchen" },
  { name: "Hamburg", slug: "hamburg" },
  { name: "Köln", slug: "koeln" },
  { name: "Frankfurt", slug: "frankfurt-am-main" },
  { name: "Stuttgart", slug: "stuttgart" },
];

export default function HomeIndex() {
  const router = useRouter();
  const primaryColor = usePrimaryColor();
  useTrackMobileScreen("home");
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    normalizeToStartOfDay(new Date()),
  );
  const [searchVisible, setSearchVisible] = useState(false);

  // Cached coords are available immediately from the persisted store
  const cachedCoords = useLocationStore((s) => s.cachedCoords);
  const setStoredCoords = useLocationStore((s) => s.setCoords);

  // Only show "loading" spinner when there is no cached location yet
  const [locationLoading, setLocationLoading] = useState(!cachedCoords);
  const [locationError, setLocationError] = useState(false);

  // coords used for queries = cached value (updated in-place when OS responds)
  const [coords, setCoords] = useState(cachedCoords);

  // Request fresh location from OS; update store & local state when it arrives
  const requestLocation = async () => {
    setLocationLoading(!coords); // only show spinner if we have nothing cached
    setLocationError(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        trackMobileEvent({
          name: "mobile-location-permission-result",
          screen: "home",
          result: "denied",
        });
        setLocationError(!coords); // only surface error when there's no fallback
        setLocationLoading(false);
        return;
      }
      trackMobileEvent({
        name: "mobile-location-permission-result",
        screen: "home",
        result: "granted",
      });
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const fresh = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setStoredCoords(fresh); // persist for next launch
      setCoords(fresh); // update query immediately
    } catch (err) {
      console.error("Error getting location", err);
      trackMobileEvent({
        name: "mobile-location-permission-result",
        screen: "home",
        result: "error",
      });
      if (!coords) setLocationError(true);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void requestLocation();
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch server-grouped nearby movies via tRPC if coords are available
  const nearbyMoviesQuery = useQuery(
    trpc.cinemas.getNearbyMovies.queryOptions(
      {
        latitude: coords?.latitude ?? 0,
        longitude: coords?.longitude ?? 0,
        maxDistanceKm: 25,
        date: selectedDate,
      },
      {
        enabled: !!coords,
      },
    ),
  );

  // Prefetch tomorrow and the day after in the background once coords are ready.
  // We defer with setTimeout so the current-day query gets priority.
  useEffect(() => {
    if (!coords) return;
    const timer = setTimeout(() => {
      const tomorrow = createScheduleDate(1);
      const dayAfterTomorrow = createScheduleDate(2);

      const prefetchOptions = (date: Date) =>
        trpc.cinemas.getNearbyMovies.queryOptions({
          latitude: coords.latitude,
          longitude: coords.longitude,
          maxDistanceKm: 25,
          date,
        });

      void queryClient.prefetchQuery(prefetchOptions(tomorrow));
      void queryClient.prefetchQuery(prefetchOptions(dayAfterTomorrow));
    }, 0);
    return () => clearTimeout(timer);
  }, [coords]);

  const groupedMovies = nearbyMoviesQuery.data ?? [];

  // Accumulate the cinemas that appear near this device so the backend can
  // notify about remembered movies showing nearby. Anonymous, ids only.
  const deviceId = useDeviceStore((s) => s.deviceId);
  const nearbyMoviesData = nearbyMoviesQuery.data;
  useEffect(() => {
    if (!deviceId || !nearbyMoviesData || nearbyMoviesData.length === 0) return;
    const cinemaIds = new Set<number>();
    for (const movie of nearbyMoviesData) {
      for (const entry of movie.cinemas) {
        cinemaIds.add(entry.cinema.id);
      }
    }
    if (cinemaIds.size === 0) return;
    void apiClient.devices.reportNearbyCinemas
      .mutate({ deviceId, cinemaIds: Array.from(cinemaIds) })
      .catch((err) => console.error("Failed to report nearby cinemas", err));
  }, [deviceId, nearbyMoviesData]);

  const handleCityPress = (citySlug: string) => {
    router.push(`/city/${citySlug}`);
  };

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="bg-background flex-1"
      >
        {/* Date Picker Bar */}
        <DatePickerBar selectedDate={selectedDate} onChange={setSelectedDate} />

        <View className="gap-6 p-4">
          {/* Nearby Cinemas Section */}
          <View>
            <View className="mb-3 flex-row items-center gap-2">
              <SymbolView
                name="location.fill"
                tintColor={primaryColor}
                size={18}
              />
              <Text className="text-foreground text-xl font-bold tracking-tight">
                Filme in deiner Nähe
              </Text>
            </View>

            {locationLoading ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator color={primaryColor} size="small" />
                <Text className="text-muted-foreground mt-2 text-xs font-medium">
                  Bestimme Standort...
                </Text>
              </View>
            ) : locationError || !coords ? (
              <View className="bg-muted border-border/40 rounded-xl border p-4">
                <Text className="text-foreground mb-1 text-sm font-semibold">
                  Standortfreigabe inaktiv
                </Text>
                <Text className="text-muted-foreground mb-3 text-xs leading-relaxed">
                  Aktiviere den Standortzugriff, um Kinos in deiner direkten
                  Umgebung zu finden.
                </Text>
                <Pressable
                  onPress={requestLocation}
                  className="self-start rounded-lg px-4 py-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Text className="text-xs font-bold text-white">
                    Standort freigeben
                  </Text>
                </Pressable>
              </View>
            ) : nearbyMoviesQuery.isLoading ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator color={primaryColor} size="small" />
                <Text className="text-muted-foreground mt-2 text-xs font-medium">
                  Suche Kinos in der Umgebung...
                </Text>
              </View>
            ) : groupedMovies.length > 0 ? (
              groupedMovies.map((movie) => (
                <MovieCard key={movie.name} movie={movie} />
              ))
            ) : (
              <View className="bg-muted border-border/40 items-center justify-center rounded-xl border p-4">
                <Text className="text-muted-foreground text-xs italic">
                  Keine Filme oder Kinos im Umkreis von 25 km gefunden.
                </Text>
              </View>
            )}
          </View>

          {/* Browse Cities Section */}
          <View className="border-border/20 border-t pt-5">
            <Text className="text-foreground mb-3 text-lg font-bold tracking-tight">
              Beliebte Städte durchsuchen
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {POPULAR_CITIES.map((city) => (
                <Pressable
                  key={city.slug}
                  onPress={() => handleCityPress(city.slug)}
                  className="bg-muted border-border/30 active:bg-muted/80 rounded-xl border px-4 py-2.5"
                  style={{ borderCurve: "continuous" }}
                >
                  <Text className="text-foreground text-sm font-semibold">
                    {city.name}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setSearchVisible(true)}
                className="bg-muted/40 border-border/80 active:bg-muted/60 rounded-xl border border-dashed px-4 py-2.5"
                style={{ borderCurve: "continuous" }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: primaryColor }}
                >
                  Alle Städte...
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
      />
    </>
  );
}
