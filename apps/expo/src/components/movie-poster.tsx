import { Text, View } from "react-native";
import { Image } from "expo-image";

interface MoviePosterProps {
  coverUrl: string | null;
  size?: "sm" | "md" | "lg";
}

// 0.25rem spacing scale: w-12 = 48px, w-25 = 100px, w-30 = 120px
const POSTER_WIDTH_CLASS = {
  sm: "w-12",
  md: "w-25",
  lg: "w-30",
};

export function MoviePoster({ coverUrl, size = "md" }: MoviePosterProps) {
  return (
    <View
      className={`bg-muted aspect-[2/3] shrink-0 overflow-hidden rounded-xl ${POSTER_WIDTH_CLASS[size]}`}
      style={{ borderCurve: "continuous" }}
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
