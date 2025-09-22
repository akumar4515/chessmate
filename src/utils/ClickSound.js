// src/utils/ClickSound.js
import { Audio } from 'expo-av';

let clickSound = null;
let loaded = false;

export async function initClickSound() {
  if (loaded) return;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  } catch {}
  const { sound } = await Audio.Sound.createAsync(
    require('../../assets/sounds/click.mp3'),
    { volume: 0.6, shouldPlay: false }
  );
  clickSound = sound;
  loaded = true;
}

export async function playClick() {
  try {
    if (!loaded) await initClickSound();
    await clickSound.setPositionAsync(0);
    await clickSound.playAsync();
  } catch {}
}

export async function unloadClickSound() {
  try {
    if (clickSound) {
      await clickSound.unloadAsync();
      clickSound = null;
      loaded = false;
    }
  } catch {}
}