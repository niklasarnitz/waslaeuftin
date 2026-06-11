import Stack from "expo-router/stack";

export default function SearchLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: "#c03484",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Kinos & Städte" }} />
    </Stack>
  );
}
