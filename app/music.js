// app/music.js
import React, { createContext, useEffect, useRef, useState } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { usePathname } from 'expo-router';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MusicContext = createContext();

const excludedRoutes = ['/chess', '/chessAi', '/chessMulti', '/introVideo'];

export default function MusicProvider({ children }) {
  const soundRef = useRef(null);
  const pathname = usePathname();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);

  // Load music preference
  useEffect(() => {
    (async () => {
      try {
        const musicPref = await AsyncStorage.getItem('musicEnabled');
        setMusicEnabled(musicPref !== 'false');
      } catch (error) {
        console.warn('Error loading music preference:', error);
      }
    })();
  }, []);

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

        // Start if current route is allowed AND music is enabled
        if (!excludedRoutes.includes(pathname) && musicEnabled) {
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
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
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
          // Only play music if it's enabled AND not currently playing
          if (musicEnabled && !status.isPlaying) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          } else if (!musicEnabled && status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          }
        }
      } catch (e) {
        console.warn('Music route update error:', e);
      }
    };
    run();
  }, [pathname, musicEnabled]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (!soundRef.current) return;
      
      try {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;

        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // Pause music when app goes to background or becomes inactive
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          }
        } else if (nextAppState === 'active') {
          // Resume music when app becomes active (if music is enabled and not in excluded routes)
          if (musicEnabled && !excludedRoutes.includes(pathname) && !status.isPlaying) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
        }
      } catch (e) {
        console.warn('Music app state change error:', e);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [musicEnabled, pathname]);

  const contextValue = {
    isLoaded,
    isPlaying,
    musicEnabled,
    setMusicEnabled,
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
    stopMusic: async () => {
      try {
        const s = soundRef.current;
        if (!s) return;
        const status = await s.getStatusAsync();
        if (!status.isLoaded) return;
        if (status.isPlaying) {
          await s.stopAsync();
          setIsPlaying(false);
        }
      } catch (e) {
        console.warn('Music stop error:', e);
      }
    },
  };

  return <MusicContext.Provider value={contextValue}>{children}</MusicContext.Provider>;
}
