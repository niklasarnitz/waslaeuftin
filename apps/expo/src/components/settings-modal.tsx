import {
  Modal,
  Platform,
  Pressable,
  Text as RNText,
  useColorScheme,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { FieldGroup, Host, Picker, Text } from "@expo/ui";

import {
  SEARCH_RADIUS_OPTIONS,
  useSettingsStore,
} from "@waslaeuftin/expo/utils/settings";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {visible ? <SettingsModalContent onClose={onClose} /> : null}
    </Modal>
  );
}

function SettingsModalContent({ onClose }: Pick<SettingsModalProps, "onClose">) {
  const primaryColor = usePrimaryColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const searchRadiusKm = useSettingsStore((s) => s.searchRadiusKm);
  const setSearchRadiusKm = useSettingsStore((s) => s.setSearchRadiusKm);

  const bgColor = isDark ? "#1C1C1E" : "#F2F2F7";
  const textColor = isDark ? "#FFFFFF" : "#000000";

  const selectRadius = (km: number) => {
    if (km === searchRadiusKm) return;
    if (Platform.OS === "ios") {
      void Haptics.selectionAsync();
    }
    setSearchRadiusKm(km);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "ios" ? 20 : 16,
          paddingBottom: 8,
        }}
      >
        <RNText style={{ color: textColor, fontSize: 20, fontWeight: "700" }}>
          Einstellungen
        </RNText>
        <Pressable onPress={onClose} hitSlop={8}>
          <RNText
            style={{ color: primaryColor, fontSize: 16, fontWeight: "600" }}
          >
            Fertig
          </RNText>
        </Pressable>
      </View>

      {/* ── Native SwiftUI / Compose settings form ── */}
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title="Suchradius">
            <FieldGroup.SectionFooter>
              <Text>
                Wie weit dürfen Kinos für „Filme in deiner Nähe" entfernt sein?
              </Text>
            </FieldGroup.SectionFooter>
            <Picker
              selectedValue={searchRadiusKm}
              onValueChange={selectRadius}
              appearance="menu"
            >
              {SEARCH_RADIUS_OPTIONS.map((km) => (
                <Picker.Item key={km} label={`${km} km`} value={km} />
              ))}
            </Picker>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </View>
  );
}
