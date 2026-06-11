import { useColorScheme } from "react-native";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@waslaeuftin/expo/utils/api";

import "@waslaeuftin/expo/styles.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <NativeTabs minimizeBehavior="onScrollDown" tintColor="#c03484">
          <NativeTabs.Trigger name="(home)">
            <Icon sf="house.fill" />
            <Label>Entdecken</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(search)" role="search">
            <Icon sf="magnifyingglass" />
            <Label>Suche</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(favorites)" role="favorites">
            <Icon sf="star.fill" />
            <Label>Favoriten</Label>
          </NativeTabs.Trigger>
        </NativeTabs>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
