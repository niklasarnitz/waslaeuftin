import { useColorScheme } from "react-native";
import { Tabs } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { persister, queryClient } from "@waslaeuftin/expo/utils/api";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";
import {
  useDeviceRegistration,
  useNotificationDeepLink,
} from "@waslaeuftin/expo/utils/use-notifications";

import "@waslaeuftin/expo/styles.css";

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const primaryColor = usePrimaryColor();

  useDeviceRegistration();
  useNotificationDeepLink();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: primaryColor,
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: "Filme",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="film-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(upcoming)"
          options={{
            title: "Demnächst",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(favorites)"
          options={{
            title: "Erinnerungen",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="notifications-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen name="(search)" options={{ href: null }} />
      </Tabs>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <RootLayoutInner />
    </PersistQueryClientProvider>
  );
}
