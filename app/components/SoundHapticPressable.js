// app/components/SoundHapticPressable.js
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { playClick } from '../utils/ClickSound';
import * as Haptics from 'expo-haptics';

export default function SoundHapticPressable({ onPress, children, ...props }) {
  const handlePress = useCallback(
    (e) => {
      playClick();
      Haptics.selectionAsync();
      onPress?.(e);
    },
    [onPress]
  );
  return (
    <Pressable onPress={handlePress} {...props}>
      {children}
    </Pressable>
  );
}
