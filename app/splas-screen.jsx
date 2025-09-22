import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ClickSoundContext } from './clickSound';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const [currentPhase, setCurrentPhase] = useState(0); // 0: SKYNETIX, 1: App Name
  const clickSoundContext = React.useContext(ClickSoundContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const companyFadeAnim = useRef(new Animated.Value(0)).current;
  const companyScaleAnim = useRef(new Animated.Value(0.3)).current;

  // Configure full screen mode for splash screen
  useEffect(() => {
    const configureFullScreen = async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBackgroundColorAsync('#0F0F0F');
        await SystemUI.setBackgroundColorAsync('#0F0F0F');
        console.log('Splash screen full screen configured');
      } catch (error) {
        console.log('Splash screen full screen error:', error);
      }
    };
    
    configureFullScreen();
  }, []);

  useEffect(() => {
    const startAnimations = () => {
      if (currentPhase === 0) {
        // SKYNETIX phase
        Animated.parallel([
          Animated.timing(companyFadeAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.spring(companyScaleAnim, {
            toValue: 1,
            tension: 80,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start();

        // Switch to app phase after 2.5 seconds
        setTimeout(() => {
          setCurrentPhase(1);
        }, 2500);
      } else {
        // App name and icon phase
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    startAnimations();
  }, [currentPhase, fadeAnim, scaleAnim, slideAnim, companyFadeAnim, companyScaleAnim]);

  // Navigation is handled by the parent layout component

  return (
    <View style={styles.container}>
      <StatusBar hidden translucent />
      <LinearGradient
        colors={['#000000', '#1A1A1A', '#000000']}
        style={styles.gradient}
      >
        {currentPhase === 0 ? (
          // SKYNETIX Phase
          <Animated.View
            style={[
              styles.content,
              {
                opacity: companyFadeAnim,
                transform: [{ scale: companyScaleAnim }],
              },
            ]}
          >
            <Text style={styles.companyName}>SKYNETIX</Text>
            <Text style={styles.companySubtitle}>skynetix.in</Text>
          </Animated.View>
        ) : (
          // App Name and Icon Phase
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim },
                ],
              },
            ]}
          >
            {/* App Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* App Name */}
            <Text style={styles.appName}>ChessMate</Text>
            
            {/* App Tagline */}
            <Text style={styles.tagline}>Connect • Play • Spectate</Text>

            {/* Loading indicator */}
            <View style={styles.loadingContainer}>
              <View style={styles.loadingDots}>
                <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
                <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
                <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
              </View>
            </View>
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  companyName: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 4,
  },
  companySubtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 2,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#AAAAAA',
    marginBottom: 50,
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 50,
  },
  loadingDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ECDC4',
    marginHorizontal: 4,
  },
});