import { useEffect } from "react";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { trackMobileEvent } from "@waslaeuftin/expo/utils/analytics";
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

  useEffect(() => {
    trackMobileEvent({ name: "mobile-app-opened" });
  }, []);

  useDeviceRegistration();
  useNotificationDeepLink();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <NativeTabs tintColor={primaryColor} minimizeBehavior="onScrollDown">
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Icon
            sf={{ default: "film", selected: "film.fill" }}
            md="movie"
          />
          <NativeTabs.Trigger.Label>Filme</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(upcoming)">
          <NativeTabs.Trigger.Icon
            sf={{ default: "calendar", selected: "calendar" }}
            md="calendar_month"
          />
          <NativeTabs.Trigger.Label>Demnächst</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(reminders)">
          <NativeTabs.Trigger.Icon
            sf={{ default: "bell", selected: "bell.fill" }}
            md="notifications"
          />
          <NativeTabs.Trigger.Label>Erinnerungen</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        {/* iOS 26 renders this as the detached liquid-glass search button on
            the tab bar (à la Apple Music). Keep it last per platform guidance. */}
        <NativeTabs.Trigger name="(search)" role="search">
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
          <NativeTabs.Trigger.Label>Suchen</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
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
