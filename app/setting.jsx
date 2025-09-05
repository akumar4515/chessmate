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
import { useNavigation } from '@react-navigation/native';
import { playClick } from './utils/ClickSound';


import * as Application from 'expo-application';
import { Audio } from 'expo-av'; // mic permission (expo-av/expo-audio)
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';

// Permission helpers
async function getMic() {
  // For newer SDKs, also see expo-audio's getRecordingPermissionsAsync/requestRecordingPermissionsAsync
  try { return await Audio.getPermissionsAsync?.() ?? await Audio.getRecordingPermissionsAsync?.(); }
  catch { return { granted: false, canAskAgain: true }; }
}
async function askMic() {
  try { return await Audio.requestPermissionsAsync?.() ?? await Audio.requestRecordingPermissionsAsync?.(); }
  catch { return { granted: false, canAskAgain: false }; }
}

async function getNotif() {
  try { return await Notifications.getPermissionsAsync(); }
  catch { return { granted: false, canAskAgain: true, ios: { status: 0 } }; }
}
async function askNotif() {
  try {
    return await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  } catch { return { granted: false, canAskAgain: false, ios: { status: 0 } }; }
}

// Use granular images/videos scopes on Android 13+
async function getPhotos() {
  try { return await MediaLibrary.getPermissionsAsync(false, ['photo', 'video']); }
  catch { return { granted: false, canAskAgain: true }; }
}
async function askPhotos() {
  try { return await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']); }
  catch { return { granted: false, canAskAgain: false }; }
}

// Treat iOS provisional as allowed in UI
const isNotifAllowed = (res) => res?.granted === true || res?.ios?.status === 1;

function StatusPill({ ok }) {
  return (
    <View style={[
      styles.pill,
      { backgroundColor: ok ? '#1F3B39' : '#3A1C1C', borderColor: ok ? '#2C6E6A' : '#8A2E2E' }
    ]}>
      <Text style={{ color: ok ? '#4ECDC4' : '#FF6B6B', fontWeight: '700', fontSize: 12 }}>
        {ok ? 'Granted' : 'Not granted'}
      </Text>
    </View>
  );
}

function PermissionToggleRow({ icon, title, subtitle, value, onChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIconWrap}>
          <Feather name={icon} size={18} color="#4ECDC4" />
        </View>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <StatusPill ok={value} />
        <Switch
          trackColor={{ false: '#555', true: '#2C6E6A' }}
          thumbColor={value ? '#4ECDC4' : '#999'}
          ios_backgroundColor="#3e3e3e"
          value={value}
          onValueChange={onChange}
        />
      </View>
    </View>
  );
}

export default function Settings() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);

  // Permission states
  const [mic, setMic] = useState({ granted: false, canAskAgain: true });
  const [notif, setNotif] = useState({ granted: false, canAskAgain: true, ios: { status: 0 } });
  const [photos, setPhotos] = useState({ granted: false, canAskAgain: true });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await AsyncStorage.getItem('user');
        if (mounted && u) setUser(JSON.parse(u));
      } catch {}
      const m = await getMic();
      const n = await getNotif();
      const p = await getPhotos();
      if (!mounted) return;
      setMic(m);
      setNotif(n);
      setPhotos(p);
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        (async () => {
          const m = await getMic();
          const n = await getNotif();
          const p = await getPhotos();
          setMic(m);
          setNotif(n);
          setPhotos(p);
        })();
      }
    });
    return () => { mounted = false; sub.remove(); };
  }, []);

  const appName = Application.applicationName ?? 'ChessMate';
  const appVersion = Application.nativeApplicationVersion ?? '—';
  const buildNumber = Application.nativeBuildVersion ?? '—';

  const openSettings = () => Linking.openSettings().catch(() => {});

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>{playClick(), navigation.goBack()}} style={styles.backBtn}>
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
              <TouchableOpacity onPress={() =>{playClick(), navigation.navigate('User')}}>
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
            <TouchableOpacity onPress={() =>{playClick(), navigation.navigate('Items')}} activeOpacity={0.85} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Feather name="box" size={18} color="#4ECDC4" />
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
            <TouchableOpacity onPress={() =>{playClick(), navigation.navigate('Privacy')}} activeOpacity={0.85} style={styles.row}>
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

            <TouchableOpacity onPress={() =>{playClick(), navigation.navigate('TermOfUse')}} activeOpacity={0.85} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Feather name="file-text" size={18} color="#4ECDC4" />
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

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <View style={styles.card}>
            {/* Mic */}
            <PermissionToggleRow
              icon="mic"
              title="Microphone"
              subtitle="Voice and in-game chat"
              value={!!mic.granted}
              onChange={async (val) => {
                if (val) {
                  const res = await askMic();
                  setMic(res);
                  if (!res.granted && res.canAskAgain === false) openSettings();
                } else {
                  openSettings(); // revocation happens in OS settings
                }
              }}
            />
            {/* Notifications */}
            <PermissionToggleRow
              icon="bell"
              title="Notifications"
              subtitle="Invites and game updates"
              value={isNotifAllowed(notif)}
              onChange={async (val) => {
                if (val) {
                  const res = await askNotif();
                  setNotif(res);
                  if (!isNotifAllowed(res) && res.canAskAgain === false) openSettings();
                } else {
                  openSettings();
                }
              }}
            />
            {/* Photos */}
            <PermissionToggleRow
              icon="image"
              title="Photos / Media"
              subtitle="Pick avatars and share images"
              value={!!photos.granted}
              onChange={async (val) => {
                if (val) {
                  const res = await askPhotos();
                  setPhotos(res);
                  if (!res.granted && res.canAskAgain === false) openSettings();
                } else {
                  openSettings();
                }
              }}
            />
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
                    Version {appVersion} • Build {buildNumber}
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
              playClick(),
              navigation.navigate('User');
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
  container: { flex: 1, paddingTop: 45, backgroundColor: '#0F0F0F' },
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
