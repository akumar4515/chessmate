import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function IntroVideo() {
  const video = useRef(null);
  const router = useRouter();
  const [videoStatus, setVideoStatus] = useState({});

  useEffect(() => {
    console.log("✅ introVideo screen mounted");
    
    // Auto-navigate after video completes or 5 seconds max
    const timeout = setTimeout(() => {
      console.log("🕐 Intro video timeout, navigating to home");
      router.replace('/');
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const handleVideoEnd = (status) => {
    if (status.didJustFinish) {
      console.log("🎬 Intro video finished, navigating to home");
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="black" translucent />
      <Video
        ref={video}
        style={styles.video}
        source={require('../assets/images/splash.mp4')} // Make sure this path is correc
        useNativeControls={false}
        resizeMode="contain"
        shouldPlay={true}
        isLooping={false}
        volume={0.8}
        onPlaybackStatusUpdate={(status) => {
          setVideoStatus(status);
          if (status.didJustFinish) {
            handleVideoEnd(status);
          }
        }}
        onLoad={(status) => {
          console.log("📹 Video loaded successfully");
        }}
        onError={(error) => {
          console.error("❌ Video error:", error);
          // Navigate to home if video fails to load
          setTimeout(() => router.replace('/'), 1000);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    width,
    height,
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
