import { Text, View } from "react-native";
import { Image } from "expo-image";

interface MoviePosterProps {
  coverUrl: string | null;
  size?: "sm" | "md" | "lg";
}

const POSTER_WIDTH = {
  sm: 48,
  md: 100,
  lg: 120,
};

export function MoviePoster({ coverUrl, size = "md" }: MoviePosterProps) {
  return (
    <View
      className="bg-muted shrink-0 overflow-hidden rounded-xl"
      style={{
        width: POSTER_WIDTH[size],
        aspectRatio: 2 / 3,
        borderCurve: "continuous",
      }}
    >
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="disk"
          transition={200}
        />
      ) : (
        <View className="bg-muted flex-1 items-center justify-center">
          <Text className="text-muted-foreground text-[10px]">🎬</Text>
        </View>
      )}
    </View>
  );
}
