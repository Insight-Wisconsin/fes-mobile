import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';

/**
 * As of SDK 56 expo-router is no longer compatible with @react-navigation/*
 * packages, so this no longer wraps PlatformPressable. expo-router passes a
 * superset of PressableProps, and the extra fields it adds (href, pressColor,
 * hoverEffect) are simply ignored by Pressable on native.
 */
export type HapticTabProps = PressableProps;

export function HapticTab({ onPressIn, ...rest }: HapticTabProps) {
  return (
    <Pressable
      {...rest}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
    />
  );
}
