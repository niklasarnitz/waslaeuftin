import { useColorScheme } from "react-native";

export const COLORS = {
  primary: {
    light: "#0066CC",
    dark: "#66B2FF",
  },
};

export function usePrimaryColor() {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? COLORS.primary.dark : COLORS.primary.light;
}
