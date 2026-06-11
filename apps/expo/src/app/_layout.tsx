import { useColorScheme } from "react-native";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { persister, queryClient } from "@waslaeuftin/expo/utils/api";

import "@waslaeuftin/expo/styles.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Slot />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
