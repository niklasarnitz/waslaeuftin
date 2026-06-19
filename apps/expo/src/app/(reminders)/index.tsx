import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { useTrackMobileScreen } from "@waslaeuftin/expo/utils/analytics";
import { useRefresh } from "@waslaeuftin/expo/utils/refresh";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";
import { getTmdbPosterUrl } from "@waslaeuftin/expo/utils/tmdb";
import { useReminders } from "@waslaeuftin/expo/utils/use-reminders";

export default function FavoritesScreen() {
  const router = useRouter();
  const primaryColor = usePrimaryColor();
  const { refreshing, onRefresh } = useRefresh();
  useTrackMobileScreen("reminders");
  const { reminders, toggle } = useReminders();

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerStyle={{ padding: 16 }}
      data={reminders}
      keyExtractor={(reminder) => String(reminder.tmdbMovieId)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={primaryColor}
        />
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/movie/[movieName]",
              params: {
                movieName: item.title,
                tmdbMovieId: String(item.tmdbMovieId),
              },
            })
          }
          className="bg-card border-border/40 mb-3 flex-row items-center gap-3 rounded-2xl border p-3"
          style={{ borderCurve: "continuous" }}
        >
          <MoviePoster coverUrl={getTmdbPosterUrl(item.posterPath)} size="sm" />
          <View className="min-w-0 flex-1 gap-1">
            <Text
              className="text-foreground text-base font-bold tracking-tight"
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {item.notifiedAt
                ? "Läuft jetzt in deiner Nähe"
                : "Wir erinnern dich, sobald er in deiner Nähe läuft."}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              toggle({
                tmdbMovieId: item.tmdbMovieId,
                title: item.title,
                posterPath: item.posterPath,
              })
            }
            hitSlop={10}
            className="p-1"
          >
            <Ionicons name="trash-outline" size={20} color={primaryColor} />
          </Pressable>
        </Pressable>
      )}
      ListEmptyComponent={
        <View className="bg-muted border-border/40 items-center justify-center rounded-xl border p-6">
          <Ionicons
            name="notifications-outline"
            size={28}
            color={primaryColor}
          />
          <Text className="text-foreground mt-2 text-sm font-semibold">
            Noch keine Erinnerungen
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-xs leading-relaxed">
            Merke dir kommende Filme unter „Demnächst“. Wir benachrichtigen
            dich, sobald sie in einem Kino in deiner Nähe laufen.
          </Text>
        </View>
      }
    />
  );
}
