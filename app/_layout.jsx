import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hides the header for all screens
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="chess" />
      <Stack.Screen name="chessAi" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="loginPage" />
      
    </Stack>
  );
}
