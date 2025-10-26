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
import { AuthLoadingProvider, useAuthLoading } from '../src/contexts/AuthLoadingContext';

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
      <AuthLoadingProvider>
        <MusicProvider>
          <ClickSoundProvider>
            <ExitConfirmProvider>
              <InnerLayout />
            </ExitConfirmProvider>
          </ClickSoundProvider>
        </MusicProvider>
      </AuthLoadingProvider>
    </ReduxProvider>
  );
}

function InnerLayout() {
  const pathname = usePathname();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { isAuthLoading: isAuthLoadingFromContext } = useAuthLoading();
  const insets = useSafeAreaInsets();

  // Back handler hook runs inside provider
  useAndroidConfirmExitOnHome();

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        
        if (token && userData) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.warn('Error checking auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Listen for authentication state changes when navigating to/from User page
  useEffect(() => {
    const checkAuthOnNavigation = async () => {
      if (pathname === '/User') {
        // When on User page, check auth status
        try {
          const token = await AsyncStorage.getItem('token');
          const userData = await AsyncStorage.getItem('user');
          setIsAuthenticated(!!(token && userData));
        } catch (error) {
          console.warn('Error checking auth on navigation:', error);
          setIsAuthenticated(false);
        }
      }
    };

    checkAuthOnNavigation();
  }, [pathname]);

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
    let timerId = null;
    let isMounted = true;
  
    const initializeApp = async () => {
      try {
        const appSession = await AsyncStorage.getItem('appSession');
        const currentTime = Date.now().toString();
  
        if (!appSession) {
          // Fresh start -> show splash and store session
          if (!isMounted) return;
          setShowSplash(true);
          setIsFirstLaunch(true);
  
          await AsyncStorage.setItem('appSession', currentTime);
  
          // Keep reference to timer so we can clear it in cleanup
          timerId = setTimeout(() => {
            if (!isMounted) return;
            setShowSplash(false);
            setIsFirstLaunch(false);
            // mark initialization finished after splash hides
            setIsAppInitialized(true);
          }, 5500);
        } else {
          // Resuming -> skip splash
          if (!isMounted) return;
          setShowSplash(false);
          setIsFirstLaunch(false);
          setIsAppInitialized(true);
        }
      } catch (error) {
        console.warn('Error initializing app:', error);
        if (!isMounted) return;
  
        // Fallback: show splash for same duration
        setShowSplash(true);
        setIsFirstLaunch(true);
        timerId = setTimeout(() => {
          if (!isMounted) return;
          setShowSplash(false);
          setIsFirstLaunch(false);
          setIsAppInitialized(true);
        }, 5500);
      }
    };
  
    initializeApp();
  
    // effect cleanup: clear timeout and mark unmounted
    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
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

  // Check if navigation should be disabled during authentication flows
  const isAuthPage = pathname === '/User';
  const shouldShowBottomNav = !['/chess', '/chessAi', '/chessMulti', '/introVideo'].includes(pathname);
  // Disable navigation when authentication is in progress (login/signup button pressed)
  const shouldDisableNav = isAuthLoadingFromContext;
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
      {shouldShowBottomNav && <BottomNav disabled={shouldDisableNav} />}
      
    </View>
  );
}
