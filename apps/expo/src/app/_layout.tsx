import { useColorScheme } from "react-native";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Ionicons } from "@expo/vector-icons";

import { queryClient, persister } from "@waslaeuftin/expo/utils/api";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

import "@waslaeuftin/expo/styles.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const primaryColor = usePrimaryColor();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <NativeTabs minimizeBehavior="onScrollDown" tintColor={primaryColor}>
          <NativeTabs.Trigger name="(home)">
            <Icon
              sf="house.fill"
              androidSrc={<VectorIcon family={Ionicons} name="home" />}
            />
            <Label>Entdecken</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(search)" role="search">
            <Icon
              sf="magnifyingglass"
              androidSrc={<VectorIcon family={Ionicons} name="search" />}
            />
            <Label>Suche</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(favorites)" role="favorites">
            <Icon
              sf="star.fill"
              androidSrc={<VectorIcon family={Ionicons} name="star" />}
            />
            <Label>Favoriten</Label>
          </NativeTabs.Trigger>
        </NativeTabs>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
