import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, usePathname } from 'expo-router';

export default function BottomNav() {
  const navigation = useNavigation();
  const pathname = usePathname(); // like "/User" or "/"

  const handlePage = (name) => {
    const path = name === 'index' ? '/' : `/${name}`;
    if (pathname !== path) {
      navigation.navigate(name);
    }
  };

  return (
    <View style={styles.footer}>
      <TouchableOpacity onPress={() => handlePage('index')}>
        <Image
          source={require('../assets/images/home/home.png')}
          style={[
            styles.footerIcon,
            pathname === '/' && styles.activeIcon,
          ]}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handlePage('Friend')}>
        <Image
          source={require('../assets/images/home/frnd.png')}
          style={[
            styles.footerIcon,
            pathname === '/Friend' && styles.activeIcon,
          ]}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Alert.alert('Coming Soon')}>
        <Image
          source={require('../assets/images/home/cart.png')}
          style={[
            styles.footerIcon,
            pathname === '/cart' && styles.activeIcon,
          ]}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handlePage('User')}>
        <Image
          source={require('../assets/images/home/user.png')}
          style={[
            styles.footerIcon,
            pathname === '/User' && styles.activeIcon,
          ]}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
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
  },
  footerIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    tintColor: '#EDEDED',
  },
  activeIcon: {
    tintColor: '#B76E79',
  },
});

