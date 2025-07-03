import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video } from 'expo-av';
import { useRouter } from 'expo-router';

export default function IntroVideo() {
  const video = useRef(null);
  const router = useRouter();

  useEffect(() => {
    console.log("✅ introVideo screen mounted");

    const timeout = setTimeout(() => {
      router.replace('/');
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        source={require('../assets/images/splash.mp4')}
        style={styles.video}
        resizeMode="cover"
        shouldPlay
        isMuted={false}
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.didJustFinish) {
            router.replace('/');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  video: {
    flex: 1,
  },
});
