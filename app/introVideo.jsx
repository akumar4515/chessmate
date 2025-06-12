// app/introVideo.js
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video } from 'expo-av';
import { useRouter } from 'expo-router';

export default function IntroVideo() {
  const video = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/'); // navigate after video ends
    }, 5000); // optional fallback in case video doesn't fire onEnd

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        source={require('../assets/images/splash.mp4')} // Replace with your actual video
        style={styles.video}
        resizeMode="cover"
        shouldPlay
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
