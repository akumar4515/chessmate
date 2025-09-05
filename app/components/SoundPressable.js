// app/components/SoundPressable.js
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { playClick } from '../utils/ClickSound';

export default function SoundPressable({ onPress, children, ...props }) {
  const handlePress = useCallback(
    (e) => {
      playClick();
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
