// app/_layout.jsx
import { Stack, usePathname } from 'expo-router';
import { View, Dimensions, AppState } from 'react-native';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ExitConfirmProvider } from '../src/components/ExitConfirmProvider';
import { useAndroidConfirmExitOnHome } from '../src/hooks/useAndroidConfirmAndExit';
import { initClickSound, unloadClickSound } from '../src/utils/ClickSound';
import ReduxProvider from '../src/components/ReduxProvider';

import MusicProvider from './music.js';
import ClickSoundProvider from './clickSound.js';
import BottomNav from './bottomNav.jsx';
import SplashScreen from './splas-screen.jsx';

const BOTTOM_NAV_HEIGHT = 80;

export default function Layout() {

  // Initialize and cleanup the click sound at app root
  useEffect(() => {
    initClickSound();
    return () => { unloadClickSound(); };
  }, []);

  // Handle app state changes for music cleanup
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background or becoming inactive
        // Music will be handled by the MusicProvider
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <ReduxProvider>
      <MusicProvider>
        <ClickSoundProvider>
          <ExitConfirmProvider>
            <InnerLayout />
          </ExitConfirmProvider>
        </ClickSoundProvider>
      </MusicProvider>
    </ReduxProvider>
  );
}

function InnerLayout() {
  const pathname = usePathname();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const insets = useSafeAreaInsets();

  // Back handler hook runs inside provider
  useAndroidConfirmExitOnHome();

  // Configure full screen mode on app start
  useEffect(() => {
    const configureFullScreen = async () => {
      try {
        // Add a small delay to ensure the app is fully loaded
        setTimeout(async () => {
          try {
            // Hide navigation bar and set background to match app
            await NavigationBar.setVisibilityAsync('hidden');
            await NavigationBar.setBackgroundColorAsync('#0F0F0F');
            
            // Configure system UI for full screen
            await SystemUI.setBackgroundColorAsync('#0F0F0F');
            
            console.log('Full screen configured successfully');
          } catch (navError) {
            console.log('Navigation bar error:', navError);
            // Retry after a longer delay
            setTimeout(async () => {
              try {
                await NavigationBar.setVisibilityAsync('hidden');
                await NavigationBar.setBackgroundColorAsync('#0F0F0F');
                await SystemUI.setBackgroundColorAsync('#0F0F0F');
                console.log('Full screen configured on retry');
              } catch (retryError) {
                console.log('Retry failed:', retryError);
              }
            }, 1000);
          }
        }, 100);
      } catch (error) {
        console.log('Full screen configuration error:', error);
      }
    };
    
    configureFullScreen();
  }, []);


  // Show splash screen only on true app startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if this is a fresh app start by looking for app session
        const appSession = await AsyncStorage.getItem('appSession');
        const currentTime = Date.now();
        
        if (!appSession) {
          // This is a fresh app start - show splash screen
          console.log('Fresh app start detected - showing splash screen');
          setShowSplash(true);
          setIsFirstLaunch(true);
          setIsAppInitialized(true);
          
          // Store app session to prevent splash on resume
          await AsyncStorage.setItem('appSession', currentTime.toString());
          
          // Show splash screen for 5.5 seconds
          const timer = setTimeout(async () => { 
            console.log('Splash screen timeout - hiding splash');
            setShowSplash(false); 
            setIsFirstLaunch(false);
          }, 5500);

          return () => clearTimeout(timer);
        } else {
          // App is resuming - don't show splash screen
          console.log('App resuming - skipping splash screen');
          setShowSplash(false);
          setIsFirstLaunch(false);
          setIsAppInitialized(true);
        }
      } catch (error) {
        console.warn('Error initializing app:', error);
        // On error, show splash screen as fallback
        setShowSplash(true);
        setIsFirstLaunch(true);
        setIsAppInitialized(true);
        
        const timer = setTimeout(() => { 
          setShowSplash(false); 
          setIsFirstLaunch(false); 
        }, 5500);
        return () => clearTimeout(timer);
      }
    };

    initializeApp();
  }, []);

  // Handle app state changes - clear session when app is backgrounded for long time
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Store the time when app goes to background
        try {
          await AsyncStorage.setItem('appBackgroundTime', Date.now().toString());
        } catch (error) {
          console.warn('Error storing background time:', error);
        }
      } else if (nextAppState === 'active') {
        // Check if app was backgrounded for more than 30 seconds (likely closed)
        try {
          const lastBackgroundTime = await AsyncStorage.getItem('appBackgroundTime');
          if (lastBackgroundTime) {
            const timeDiff = Date.now() - parseInt(lastBackgroundTime);
            if (timeDiff > 30000) { // 30 seconds
              console.log('App was backgrounded for long time - clearing session for next fresh start');
              await AsyncStorage.removeItem('appSession');
            }
          }
        } catch (error) {
          console.warn('Error checking background time:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove?.();
  }, [pathname]);


  if (showSplash || isFirstLaunch || !isAppInitialized) return <SplashScreen key="splash-screen" />;

  const shouldShowBottomNav = !['/chess', '/chessAi', '/chessMulti', '/introVideo'].includes(pathname);
  const contentBottomPadding = shouldShowBottomNav ? BOTTOM_NAV_HEIGHT : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
      <StatusBar style="light" hidden={true} translucent={true} />
      <View style={{ 
        flex: 1, 
        paddingTop: 0, // Remove top padding for full screen
        paddingBottom: contentBottomPadding + Math.max(insets.bottom, 0)
      }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { 
              backgroundColor: '#0F0F0F',
              flex: 1
            },
            animation: 'slide_from_right',
          }}
        />
      </View>
      {shouldShowBottomNav && <BottomNav />}
      
    </View>
  );
}
