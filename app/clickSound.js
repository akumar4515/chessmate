// app/clickSound.js
import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playClick as playClickSound } from '../src/utils/ClickSound.js';

export const ClickSoundContext = createContext();

export default function ClickSoundProvider({ children }) {
  const [clickSoundEnabled, setClickSoundEnabled] = useState(true); // Default to enabled

  // Load click sound preference
  useEffect(() => {
    (async () => {
      try {
        const clickPref = await AsyncStorage.getItem('clickSoundEnabled');
        // If no preference is stored, keep default (true)
        // If preference is stored, use the stored value
        if (clickPref !== null) {
          setClickSoundEnabled(clickPref === 'true');
        }
      } catch (error) {
        console.warn('Error loading click sound preference:', error);
      }
    })();
  }, []);

  const playClick = async () => {
    if (clickSoundEnabled) {
      try {
        await playClickSound();
      } catch (error) {
        console.warn('Error playing click sound:', error);
      }
    }
  };

  const updateClickSoundPreference = async (enabled) => {
    setClickSoundEnabled(enabled);
    try {
      await AsyncStorage.setItem('clickSoundEnabled', enabled.toString());
    } catch (error) {
      console.error('Error saving click sound preference:', error);
    }
  };

  const contextValue = {
    clickSoundEnabled,
    setClickSoundEnabled: updateClickSoundPreference,
    playClick,
  };

  return <ClickSoundContext.Provider value={contextValue}>{children}</ClickSoundContext.Provider>;
}
