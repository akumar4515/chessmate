// src/hooks/useAndroidConfirmAndExit.js
import { useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useExitConfirm } from '../components/ExitConfirmProvider';

export function useAndroidConfirmExitOnHome() {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useExitConfirm();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (pathname === '/') { open(); return true; } // show themed modal on Home
      // Let chess game pages handle their own back button behavior
      if (pathname === '/chess' || pathname === '/chessAi' || pathname === '/chessMulti') {
        return false; // Let local handlers take over
      }
      router.back(); return true; // go back elsewhere
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [pathname, router, open]);
}