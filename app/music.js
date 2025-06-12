// providers/MusicProvider.js
import React, { createContext, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { usePathname } from 'expo-router';

export const MusicContext = createContext();

const excludedRoutes = ['/chess', '/chessAi', '/introVideo'];

export default function MusicProvider({ children }) {
  const sound = useRef(null);
  const pathname = usePathname();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const manageAudio = async () => {
      try {
        // Load once
        if (!sound.current && !excludedRoutes.includes(pathname)) {
          const { sound: loadedSound } = await Audio.Sound.createAsync(
            require('../assets/sounds/audio.mp3'),
            { isLooping: true, volume: 0.5 }
          );
          sound.current = loadedSound;
          await loadedSound.playAsync();
          setIsLoaded(true);
        } else if (sound.current) {
          const status = await sound.current.getStatusAsync();

          if (excludedRoutes.includes(pathname)) {
            if (status.isPlaying) {
              await sound.current.pauseAsync();
            }
          } else {
            if (!status.isPlaying) {
              await sound.current.playAsync();
            }
          }
        }
      } catch (error) {
        console.warn('Audio error:', error);
      }
    };

    manageAudio();

    return () => {
      // Optional: stop music completely if app is closed
      // sound.current?.unloadAsync();
    };
  }, [pathname]);

  return (
    <MusicContext.Provider value={{}}>
      {children}
    </MusicContext.Provider>
  );
}
