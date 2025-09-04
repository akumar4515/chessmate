import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Alert, Dimensions, SafeAreaView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';





const { width, height } = Dimensions.get('window');

export default function BottomNav() {
  const navigation = useRouter();
const pathname = usePathname();

  const handlePage = (name) => {
    const path = name === 'index' ? '/' : `/${name}`;
    if (pathname !== path) {
      navigation.navigate(name);
    }
  };

  return (
    <SafeAreaView style={styles.footer}>
      <TouchableOpacity onPress={() => handlePage('/')} style={styles.iconButton}>
        <Image
          source={require('../assets/images/home/home.png')}
          style={[styles.footerIcon, pathname === '/' ? styles.activeIcon : null]}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => handlePage('Friend')} style={styles.iconButton}>
        <Image
          source={require('../assets/images/home/frnd.png')}
          style={[styles.footerIcon, pathname === '/Friend' ? styles.activeIcon : null]}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => Alert.alert('Coming Soon')} style={styles.iconButton}>
        <Image
          source={require('../assets/images/home/cart.png')}
          style={styles.footerIcon}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => handlePage('User')} style={styles.iconButton}>
        <Image
          source={require('../assets/images/home/user.png')}
          style={[styles.footerIcon, pathname === '/User' ? styles.activeIcon : null]}
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
    tintColor: '#FFFFFF', // Active icon in white
  },
});