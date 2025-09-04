
import { Stack, usePathname } from 'expo-router';
import { View, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MusicProvider from './music.js';
import BottomNav from './bottomNav.jsx';
import SplashScreen from './splas-screen.jsx'; // Import splash screen

const { height: screenHeight } = Dimensions.get('window');
const BOTTOM_NAV_HEIGHT = 30;

export default function Layout() {
  const pathname = usePathname();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  useEffect(() => {
    console.log('Current route:', pathname);
    
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    // Check if this is first launch
    checkFirstLaunch();

    return () => subscription?.remove();
  }, [pathname]);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched === null) {
        // First launch - show splash for 3 seconds
        await AsyncStorage.setItem('hasLaunched', 'true');
        setTimeout(() => {
          setShowSplash(false);
          setIsFirstLaunch(false);
        }, 3000);
      } else {
        // Not first launch - skip splash
        setShowSplash(false);
        setIsFirstLaunch(false);
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
      // Fallback - show splash briefly
      setTimeout(() => {
        setShowSplash(false);
        setIsFirstLaunch(false);
      }, 1000);
    }
  };

  // Show splash screen if it's the first launch or still loading
  if (showSplash || isFirstLaunch) {
    return <SplashScreen />;
  }

  const shouldShowBottomNav = !['/chess', '/chessAi', '/chessMulti', '/introVideo'].includes(pathname);
  
  const availableHeight = shouldShowBottomNav
    ? dimensions.height - BOTTOM_NAV_HEIGHT - (StatusBar.currentHeight || 0)
    : dimensions.height;

  return (
    <MusicProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        <View style={{ flex: 1, height: availableHeight }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000000' },
              animation: 'slide_from_right',
            }}
          />
        </View>
        
        {shouldShowBottomNav && <BottomNav />}
      </SafeAreaView>
    </MusicProvider>
  );
}
