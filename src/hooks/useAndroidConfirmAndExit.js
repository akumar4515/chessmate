// src/hooks/useAndroidConfirmAndExit.js
import { useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useExitConfirm } from '../components/ExitConfirmProvider';
import { useAuthLoading } from '../contexts/AuthLoadingContext';

export function useAndroidConfirmExitOnHome() {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useExitConfirm();
  const { isAuthLoading } = useAuthLoading();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      // Prevent back navigation during authentication processes
      if (isAuthLoading) {
        return true; // Block back navigation during login/signup
      }
      
      if (pathname === '/') { open(); return true; } // show themed modal on Home
      // Let chess game pages handle their own back button behavior
      if (pathname === '/chess' || pathname === '/chessAi' || pathname === '/chessMulti') {
        return false; // Let local handlers take over
      }
      router.back(); return true; // go back elsewhere
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [pathname, router, open, isAuthLoading]);
}