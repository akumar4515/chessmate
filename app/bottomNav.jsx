import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Alert, Dimensions, SafeAreaView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const { width, height } = Dimensions.get('window');
import { ClickSoundContext } from './clickSound';

export default function BottomNav({ disabled = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const clickSoundContext = React.useContext(ClickSoundContext);

  const handlePage = (nameOrPath) => {
    if (disabled) return; // Don't navigate if disabled
    const path = nameOrPath === 'index' || nameOrPath === '/' ? '/' : `/${nameOrPath}`;
    if (pathname !== path) {
      router.push(path);
    }
  };

  return (
    <SafeAreaView style={styles.footer}>
      <TouchableOpacity 
        onPress={() =>{if (!disabled) clickSoundContext?.playClick?.(), handlePage('/')}} 
        style={[styles.iconButton, disabled && styles.disabledButton]}
        disabled={disabled}
      >
        <Image
          source={require('../assets/images/home/home.png')}
          style={[styles.footerIcon, pathname === '/' ? styles.activeIcon : null, disabled && styles.disabledIcon]}
        />
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() =>{if (!disabled) clickSoundContext?.playClick?.(), handlePage('Friend')}} 
        style={[styles.iconButton, disabled && styles.disabledButton]}
        disabled={disabled}
      >
        <Image
          source={require('../assets/images/home/frnd.png')}
          style={[styles.footerIcon, pathname === '/Friend' ? styles.activeIcon : null, disabled && styles.disabledIcon]}
        />
      </TouchableOpacity>

      {/* <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), Alert.alert('Coming Soon')}} style={styles.iconButton}>
        <Image
          source={require('../assets/images/home/cart.png')}
          style={styles.footerIcon}
        />
      </TouchableOpacity> */}

      <TouchableOpacity 
        onPress={() =>{if (!disabled) clickSoundContext?.playClick?.(), handlePage('User')}} 
        style={[styles.iconButton, disabled && styles.disabledButton]}
        disabled={disabled}
      >
        <Image
          source={require('../assets/images/home/user.png')}
          style={[styles.footerIconiii, pathname === '/User' ? styles.activeIcon : null, disabled && styles.disabledIcon]}
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#000000', // Pure black background
    paddingVertical: Math.max(12, height * 0.015),
    paddingHorizontal: width * 0.05,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    height: 80,
    borderTopWidth: 1,
    borderTopColor: '#333333', // Subtle top border
  },
  iconButton: {
    padding: 8,
    borderRadius: 25,
    minWidth: Math.min(width * 0.15, 60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerIcon: {
    width: Math.min(width * 0.12, 48),
    height: Math.min(width * 0.12, 48),
    resizeMode: 'contain',
    tintColor: '#AAAAAA', // Inactive icons in light gray
  },
  activeIcon: {
    tintColor: '#77d1e5ff', // Active icon in white
  },
  footerIconiii: {
    width: Math.min(width * 0.18, 40),
    height: Math.min(width * 0.18, 30),
    resizeMode: 'contain',
    tintColor: '#AAAAAA', // Inactive icons in light gray
  },
  disabledButton: {
    opacity: 0.3,
  },
  disabledIcon: {
    opacity: 0.3,
    tintColor: '#666666', // Darker gray for disabled state
  }
});