import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { getTmdbPosterUrl } from "@waslaeuftin/core";
import { AppIcon } from "@waslaeuftin/expo/components/app-icon";
import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { useTrackMobileScreen } from "@waslaeuftin/expo/utils/analytics";
import { useRefresh } from "@waslaeuftin/expo/utils/refresh";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";
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
        <View
          className="bg-card mb-3 flex-row items-center gap-3 rounded-3xl p-4"
          style={{ borderCurve: "continuous" }}
        >
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
            accessibilityRole="button"
            className="flex-1 flex-row items-center gap-3"
          >
            <MoviePoster
              coverUrl={getTmdbPosterUrl(item.posterPath)}
              size="sm"
            />
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
          </Pressable>
          <Pressable
            onPress={() =>
              toggle({
                tmdbMovieId: item.tmdbMovieId,
                title: item.title,
                posterPath: item.posterPath,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Erinnerung an ${item.title} entfernen`}
            style={{ minHeight: 44, minWidth: 44 }}
            className="items-center justify-center"
          >
            <AppIcon name="trash" size={20} color={primaryColor} />
          </Pressable>
        </View>
      )}
      ListEmptyComponent={
        <View className="bg-muted border-border/40 items-center justify-center rounded-xl border p-6">
          <AppIcon name="bell" size={28} color={primaryColor} />
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
