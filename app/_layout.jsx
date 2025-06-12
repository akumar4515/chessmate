// app/_layout.js
import { Stack } from 'expo-router';
import MusicProvider from '../app/music.js';

export default function RootLayout() {
  return (
    <MusicProvider>
      <Stack
        initialRouteName="introVideo" // 👈 Set this explicitly!
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="introVideo" />
        <Stack.Screen name="index" />
        <Stack.Screen name="chess" />
        <Stack.Screen name="chessAi" />
        <Stack.Screen name="user" />
      </Stack>
    </MusicProvider>
  );
}
