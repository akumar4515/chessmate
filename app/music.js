import React, { createContext, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { usePathname } from 'expo-router';

export const MusicContext = createContext();

const excludedRoutes = ['/chess', '/chessAi', '/chessMulti', '/introVideo'];

export default function MusicProvider({ children }) {
  const sound = useRef(null);
  const pathname = usePathname();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Set audio mode for better compatibility
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.warn('Audio mode setup error:', error);
      }
    };

    initializeAudio();
  }, []);

  useEffect(() => {
    const manageAudio = async () => {
      try {
        // Load audio only once
        if (!sound.current && !excludedRoutes.includes(pathname)) {
          console.log("🎵 Loading background music");
          const { sound: loadedSound } = await Audio.Sound.createAsync(
            require('../assets/sounds/audio.mp3'),
            { 
              isLooping: true, 
              volume: 0.3, // Reduced volume for better UX
              shouldPlay: true,
            }
          );
          
          sound.current = loadedSound;
          setIsLoaded(true);
          setIsPlaying(true);
          console.log("🎵 Background music started");
        } else if (sound.current) {
          const status = await sound.current.getStatusAsync();
          
          if (excludedRoutes.includes(pathname)) {
            // Pause music in excluded routes
            if (status.isLoaded && status.isPlaying) {
              await sound.current.pauseAsync();
              setIsPlaying(false);
              console.log("⏸️ Background music paused");
            }
          } else {
            // Resume music in allowed routes
            if (status.isLoaded && !status.isPlaying) {
              await sound.current.playAsync();
              setIsPlaying(true);
              console.log("▶️ Background music resumed");
            }
          }
        }
      } catch (error) {
        console.warn('🎵 Audio management error:', error);
      }
    };

    manageAudio();

    return () => {
      // Cleanup when component unmounts
      if (sound.current) {
        sound.current.unloadAsync().catch(console.warn);
      }
    };
  }, [pathname]);

  const contextValue = {
    isLoaded,
    isPlaying,
    toggleMusic: async () => {
      if (sound.current) {
        try {
          const status = await sound.current.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await sound.current.pauseAsync();
              setIsPlaying(false);
            } else {
              await sound.current.playAsync();
              setIsPlaying(true);
            }
          }
        } catch (error) {
          console.warn('Music toggle error:', error);
        }
      }
    },
  };

  return (
    <MusicContext.Provider value={contextValue}>
      {children}
    </MusicContext.Provider>
  );
}
