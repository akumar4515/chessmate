// app/_layout.jsx
import { Stack, usePathname } from 'expo-router';
import { View, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ExitConfirmProvider } from './components/ExitConfirmProvider';
import { useAndroidConfirmExitOnHome } from './hooks/useAndroidConfirmAndExit';
// NOTE: file name is clickSound.js (lowercase 'c'); adjust if different
import { initClickSound, unloadClickSound } from './utils/ClickSound';

import MusicProvider from './music.js';
import BottomNav from './bottomNav.jsx';
import SplashScreen from './splas-screen.jsx';

const BOTTOM_NAV_HEIGHT = 80;

export default function Layout() {
  // Initialize and cleanup the click sound at app root
  useEffect(() => {
    initClickSound();
    return () => { unloadClickSound(); };
  }, []);

  return (
    <MusicProvider>
      <ExitConfirmProvider>
        <InnerLayout />
      </ExitConfirmProvider>
    </MusicProvider>
  );
}

function InnerLayout() {
  const pathname = usePathname();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // Back handler hook runs inside provider
  useAndroidConfirmExitOnHome();

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    checkFirstLaunch();
    return () => sub?.remove?.();
  }, [pathname]);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched === null) {
        await AsyncStorage.setItem('hasLaunched', 'true');
        setTimeout(() => { setShowSplash(false); setIsFirstLaunch(false); }, 3000);
      } else {
        setShowSplash(false); setIsFirstLaunch(false);
      }
    } catch {
      setTimeout(() => { setShowSplash(false); setIsFirstLaunch(false); }, 1000);
    }
  };

  if (showSplash || isFirstLaunch) return <SplashScreen />;

  const shouldShowBottomNav = !['/chess', '/chessAi', '/chessMulti', '/introVideo'].includes(pathname);
  const contentBottomPadding = shouldShowBottomNav ? BOTTOM_NAV_HEIGHT : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={{ flex: 1, paddingBottom: contentBottomPadding }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#000' },
            animation: 'slide_from_right',
          }}
        />
      </View>
      {shouldShowBottomNav && <BottomNav />}
    </SafeAreaView>
  );
}
