// app/music.js
import React, { createContext, useEffect, useRef, useState } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { usePathname } from 'expo-router';

export const MusicContext = createContext();

const excludedRoutes = ['/chess', '/chessAi', '/chessMulti', '/introVideo'];

export default function MusicProvider({ children }) {
  const soundRef = useRef(null);
  const pathname = usePathname();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Configure audio + load music once
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
      await Audio.setAudioModeAsync({
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  allowsRecordingIOS: false,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,         // <— enum
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers, // <— enum
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});

        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/audio.mp3'),
          { isLooping: true, volume: 0.3, shouldPlay: false }
        );
        soundRef.current = sound;
        if (!mounted) return;

        setIsLoaded(true);

        // Start if current route is allowed
        if (!excludedRoutes.includes(pathname)) {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } catch (e) {
        console.warn('Music init error:', e);
      }
    })();

    // Unload only when provider unmounts
    return () => {
      mounted = false;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []); // mount/unmount only

  // Pause/Resume on route changes
  useEffect(() => {
    const run = async () => {
      if (!soundRef.current) return;
      try {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;

        if (excludedRoutes.includes(pathname)) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          }
        } else {
          if (!status.isPlaying) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
        }
      } catch (e) {
        console.warn('Music route update error:', e);
      }
    };
    run();
  }, [pathname]);

  const contextValue = {
    isLoaded,
    isPlaying,
    toggleMusic: async () => {
      try {
        const s = soundRef.current;
        if (!s) return;
        const status = await s.getStatusAsync();
        if (!status.isLoaded) return;
        if (status.isPlaying) {
          await s.pauseAsync();
          setIsPlaying(false);
        } else {
          await s.playAsync();
          setIsPlaying(true);
        }
      } catch (e) {
        console.warn('Music toggle error:', e);
      }
    },
  };

  return <MusicContext.Provider value={contextValue}>{children}</MusicContext.Provider>;
}
