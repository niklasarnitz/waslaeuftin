import { useEffect, useState } from "react";
import { useNavigation } from "expo-router";

export interface SearchBarEvent {
  nativeEvent: {
    text: string;
  };
}

export interface SearchOptions {
  placeholder?: string;
  /** Activate the search field as soon as the screen appears. */
  autoFocus?: boolean;
  onChangeText?: (e: SearchBarEvent) => void;
  onSearchButtonPress?: (e: SearchBarEvent) => void;
  onCancelButtonPress?: (e: SearchBarEvent) => void;
}

export function useSearch(options: SearchOptions = {}) {
  const [search, setSearch] = useState("");
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerSearchBarOptions: {
        ...options,
        onChangeText(e: SearchBarEvent) {
          setSearch(e.nativeEvent.text);
          options.onChangeText?.(e);
        },
        onSearchButtonPress(e: SearchBarEvent) {
          setSearch(e.nativeEvent.text);
          options.onSearchButtonPress?.(e);
        },
        onCancelButtonPress(e: SearchBarEvent) {
          setSearch("");
          options.onCancelButtonPress?.(e);
        },
      },
    });
  }, [options, navigation]);

  return search;
}
