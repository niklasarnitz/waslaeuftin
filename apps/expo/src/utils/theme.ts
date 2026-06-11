import { useColorScheme } from "react-native";

export const COLORS = {
  primary: {
    light: "#097ae6",
    dark: "#47acf5",
  },
};

export function usePrimaryColor() {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? COLORS.primary.dark : COLORS.primary.light;
}
