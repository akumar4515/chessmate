import { Stack, usePathname } from 'expo-router';
import { View, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import { useEffect, useState } from 'react';
import MusicProvider from './music.js';
import BottomNav from './bottomNav.jsx';

const { height: screenHeight } = Dimensions.get('window');
const BOTTOM_NAV_HEIGHT = 35; // Adjust based on your bottom nav height

export default function Layout() {
  const pathname = usePathname();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    console.log('Current route:', pathname);
    
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, [pathname]);

  const shouldShowBottomNav = !['/chess', '/chessAi', '/chessMulti', '/introVideo'].includes(pathname);
  const availableHeight = shouldShowBottomNav 
    ? dimensions.height - BOTTOM_NAV_HEIGHT - (StatusBar.currentHeight || 0)
    : dimensions.height;

  return (
    <MusicProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <View style={{ 
          flex: 1, 
          height: availableHeight,
          maxHeight: availableHeight 
        }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0F0F0F' },
              animation: 'slide_from_right',
            }}
          />
        </View>
        {shouldShowBottomNav && <BottomNav />}
      </SafeAreaView>
    </MusicProvider>
  );
}
