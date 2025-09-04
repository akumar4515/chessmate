// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StatusBar, SafeAreaView } from 'react-native';
import MusicProvider from './music.js';
import BottomNav from './bottomNav.jsx';
import Splash from './splas-screen.jsx';
import { usePathname } from 'expo-router';

const BOTTOM_NAV_HEIGHT = 30;

export default function RootLayout() {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const shouldShowBottomNav = !['/chess', '/chessAi', '/chessMulti', '/introVideo'].includes(pathname);

  return (
    <MusicProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000' },
              animation: 'slide_from_right',
            }}
          />
        </View>
        {shouldShowBottomNav && <BottomNav />}
        {showSplash && (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <Splash />
          </View>
        )}
      </SafeAreaView>
    </MusicProvider>
  );
}
