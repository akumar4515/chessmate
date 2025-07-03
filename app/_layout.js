import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useEffect } from 'react';
import MusicProvider from './music.js';
import BottomNav from './bottomNav.jsx'; // adjust path if needed

export default function Layout() {
  const pathname = usePathname();

  useEffect(() => {
    console.log('Current route:', pathname);
  }, [pathname]);

  return (
    <MusicProvider>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{ headerShown: false }}
          initialRouteName="introVideo"
        />
        {!['/chess', '/chessAi', '/introVideo'].includes(pathname) && <BottomNav />}
      </View>
    </MusicProvider>
  );
}
