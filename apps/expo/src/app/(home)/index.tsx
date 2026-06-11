import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import { Link, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useQuery } from "@tanstack/react-query";

import { CinemaCard } from "@waslaeuftin/expo/components/cinema-card";
import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { trpc } from "@waslaeuftin/expo/utils/api";

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Geolocation states
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<boolean>(false);

  // Request location permission & get current coordinates
  const requestLocation = async () => {
    setLocationLoading(true);
    setLocationError(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationError(true);
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (err) {
      console.error("Error getting location", err);
      setLocationError(true);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void requestLocation();
  }, []);

  // Fetch nearby cinemas via tRPC if coords are available
  const nearbyCinemasQuery = useQuery(
    trpc.cinemas.getNearbyCinemas.queryOptions(
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

  const handleCityPress = (citySlug: string) => {
    router.push(`/city/${citySlug}`);
  };

  const handleCinemaPress = (cinemaSlug: string) => {
    router.push(`/cinema/${cinemaSlug}`);
  };

  return (
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
            <SymbolView name="location.fill" tintColor="#c03484" size={18} />
            <Text className="text-foreground text-xl font-bold tracking-tight">
              Kinos in deiner Nähe
            </Text>
          </View>

          {locationLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator color="#c03484" size="small" />
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
                className="self-start rounded-lg bg-[#c03484] px-4 py-2"
              >
                <Text className="text-xs font-bold text-white">
                  Standort freigeben
                </Text>
              </Pressable>
            </View>
          ) : nearbyCinemasQuery.isLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator color="#c03484" size="small" />
              <Text className="text-muted-foreground mt-2 text-xs font-medium">
                Suche Kinos in der Umgebung...
              </Text>
            </View>
          ) : nearbyCinemasQuery.data && nearbyCinemasQuery.data.length > 0 ? (
            nearbyCinemasQuery.data.map((cinema) => (
              <CinemaCard
                key={cinema.id}
                cinema={cinema}
                onCinemaPress={() => handleCinemaPress(cinema.slug)}
              />
            ))
          ) : (
            <View className="bg-muted border-border/40 items-center justify-center rounded-xl border p-4">
              <Text className="text-muted-foreground text-xs italic">
                Keine Kinos im Umkreis von 25 km gefunden.
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
            <Link href="/(search)" asChild>
              <Pressable
                className="bg-muted/40 border-border/80 active:bg-muted/60 rounded-xl border border-dashed px-4 py-2.5"
                style={{ borderCurve: "continuous" }}
              >
                <Text className="text-sm font-semibold text-[#c03484]">
                  Alle Städte...
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
