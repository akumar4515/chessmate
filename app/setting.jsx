// app/setting.jsx (or Settings.jsx)
// Requirements (install first):
// npx expo install expo-application expo-notifications expo-av expo-media-library
// Then restart with cache clear: npx expo start -c
// If using a dev build/bare: add plugin "expo-notifications" in app config and rebuild.

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Linking,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// Click sound is now handled by context
import { MusicContext } from './music';
import { ClickSoundContext } from './clickSound';


import * as Application from 'expo-application';


function StatusPill({ ok }) {
  return (
    <View style={[
      styles.pill,
      { backgroundColor: ok ? '#1F3B39' : '#3A1C1C', borderColor: ok ? '#2C6E6A' : '#8A2E2E' }
    ]}>
      <View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: ok ? '#4ECDC4' : '#FF6B6B'
      }} />
    </View>
  );
}


export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const musicContext = React.useContext(MusicContext);
  const clickSoundContext = React.useContext(ClickSoundContext);

  
  // Music preference state - will be overridden by context
  const [musicEnabled, setMusicEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await AsyncStorage.getItem('user');
        if (mounted && u) setUser(JSON.parse(u));
        
        // Music preference is now managed by music context
      } catch {}
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
      }
    });
    return () => { mounted = false; sub.remove(); };
  }, []);

  const appName ='ChessMate';
  const appVersion = '1.0.0'
  const company ='Skynetix';

  const openSettings = () => Linking.openSettings().catch(() => {});

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.back()}} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#EDEDED" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your profile</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.username[0]?.toUpperCase() ?? 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{user?.username ?? 'Guest'}</Text>
                <Text style={styles.profileEmail}>{user?.email ?? 'Not signed in'}</Text>
              </View>
              <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.push('/User')}}>
                <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>View Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your items</Text>
          <View style={styles.card}>
            <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.push('/Items')}} activeOpacity={0.85} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Feather name="package" size={18} color="#4ECDC4" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Inventory</Text>
                  <Text style={styles.rowSubtitle}>Manage your owned items</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#777" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy & Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & policy</Text>
          <View style={styles.card}>
            <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.push('/Privacy')}} activeOpacity={0.85} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Feather name="shield" size={18} color="#4ECDC4" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Privacy Policy</Text>
                  <Text style={styles.rowSubtitle}>How data is handled</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#777" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.push('/TermOfUse')}} activeOpacity={0.85} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Feather name="file" size={18} color="#4ECDC4" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Terms of Use</Text>
                  <Text style={styles.rowSubtitle}>Rules for using the app</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#777" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Audio Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Settings</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Feather name="music" size={18} color="#4ECDC4" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Background Music</Text>
                  <Text style={styles.rowSubtitle}>Play music in the background</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                <StatusPill ok={musicContext?.isPlaying} />
                <Switch
                  trackColor={{ false: '#555', true: '#2C6E6A' }}
                  thumbColor={musicContext?.musicEnabled ? '#4ECDC4' : '#999'}
                  ios_backgroundColor="#3e3e3e"
                  value={musicContext?.musicEnabled || false}
                  onValueChange={async (val) => {
                    clickSoundContext?.playClick?.();
                    
                    // Update music context state
                    if (musicContext?.setMusicEnabled) {
                      musicContext.setMusicEnabled(val);
                    }
                    
                    // Save preference
                    try {
                      await AsyncStorage.setItem('musicEnabled', val.toString());
                    } catch (error) {
                      console.error('Error saving music preference:', error);
                    }
                    
                    // Control music based on preference
                    if (musicContext?.toggleMusic) {
                      // If music is currently playing but user wants it off, pause it
                      if (musicContext.isPlaying && !val) {
                        await musicContext.toggleMusic();
                      }
                      // If music is not playing but user wants it on, play it
                      else if (!musicContext.isPlaying && val) {
                        await musicContext.toggleMusic();
                      }
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Click Sound Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound Effects</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Feather name="volume-2" size={18} color="#4ECDC4" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Click Sounds</Text>
                  <Text style={styles.rowSubtitle}>Play sound when tapping buttons</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                <StatusPill ok={clickSoundContext?.clickSoundEnabled} />
                <Switch
                  trackColor={{ false: '#555', true: '#2C6E6A' }}
                  thumbColor={clickSoundContext?.clickSoundEnabled ? '#4ECDC4' : '#999'}
                  ios_backgroundColor="#3e3e3e"
                  value={clickSoundContext?.clickSoundEnabled || false}
                  onValueChange={async (val) => {
                    // Don't play click sound when toggling click sound itself
                    if (clickSoundContext?.setClickSoundEnabled) {
                      clickSoundContext.setClickSoundEnabled(val);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>


        {/* Version */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Version</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Feather name="info" size={18} color="#4ECDC4" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>{appName}</Text>
                  <Text style={styles.rowSubtitle}>
                    Version {appVersion} • {company}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            onPress={async () => {
              try {
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('user');
              } catch {}
              clickSoundContext?.playClick?.(),
              router.push('/User');
            }}
            style={styles.logoutBtn}
          >
            <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.logoutGradient}>
              <Feather name="log-out" size={18} color="#FFF" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F',paddingTop: 30, },
  header: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: '#333' },
  headerTitle: { color: '#EDEDED', fontSize: 22, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  section: { marginTop: 14 },
  sectionTitle: { color: '#EDEDED', fontSize: 14, fontWeight: '700', marginBottom: 8, opacity: 0.9 },
  card: { backgroundColor: '#1C1C1C', borderRadius: 16, padding: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  row: { paddingVertical: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  rowTitle: { color: '#EDEDED', fontSize: 15, fontWeight: '600' },
  rowSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2, borderColor: '#444' },
  avatarText: { color: '#EDEDED', fontWeight: '700', fontSize: 18 },
  profileName: { color: '#EDEDED', fontSize: 16, fontWeight: '700' },
  profileEmail: { color: '#888', fontSize: 12, marginTop: 2 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  smallBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  pill: { borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  footerActions: { marginTop: 16 },
  logoutBtn: { borderRadius: 14, overflow: 'hidden' },
  logoutGradient: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  logoutText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },
});
