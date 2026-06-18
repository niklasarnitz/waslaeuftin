import type { ColorValue, ViewProps } from "react-native";
import { View } from "react-native";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "expo-glass-effect";

// Resolved once per app load — depends only on OS / build capabilities.
const glassSupported = isLiquidGlassAvailable();

export { glassSupported };

interface AdaptiveGlassProps extends ViewProps {
  /** Solid colour used when liquid glass is unavailable (iOS < 26, Android). */
  fallbackColor: ColorValue;
  glassEffectStyle?: "clear" | "regular" | "none";
  tintColor?: string;
  isInteractive?: boolean;
}

/**
 * Renders a liquid-glass surface on iOS 26+ and degrades to a solid view
 * elsewhere. We supply the fallback colour ourselves because `GlassView`
 * renders as a transparent `View` on unsupported platforms.
 *
 * Note: never animate `opacity` to 0 on this view or any ancestor — it stops
 * the glass effect from rendering. Toggle `glassEffectStyle` instead.
 */
export function AdaptiveGlass({
  fallbackColor,
  glassEffectStyle = "regular",
  tintColor,
  isInteractive,
  style,
  children,
  ...rest
}: AdaptiveGlassProps) {
  if (glassSupported) {
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[{ backgroundColor: fallbackColor }, style]} {...rest}>
      {children}
    </View>
  );
}
