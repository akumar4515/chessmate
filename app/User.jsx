import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { playClick } from './utils/ClickSound';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://chessmate-backend-lfxo.onrender.com/api';

export default function AuthPage() {
  const router = useRouter();

  const [formType, setFormType] = useState('login');
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [backPressedOnce, setBackPressedOnce] = useState(false);
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({ username: '', email: '' });
  const [profilePic, setProfilePic] = useState(null);

  const messageTimeoutRef = useRef(null);

  const showMessage = (message, type) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    if (type === 'error') { setError(message); setSuccessMessage(''); } else { setSuccessMessage(message); setError(''); }
    messageTimeoutRef.current = setTimeout(() => { setError(''); setSuccessMessage(''); messageTimeoutRef.current = null; }, 3000);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        if (token && userData) {
          const parsed = JSON.parse(userData);
          const tokenRes = await axios.get(`${API_URL}/verify-token`, { headers: { Authorization: `Bearer ${token}` } });
          if (tokenRes.data.valid && !parsed.guest) {
            const full = await axios.get(`${API_URL}/user`, { headers: { Authorization: `Bearer ${token}` } });
            setUser(full.data.user);
            setEditFormData({ username: full.data.user.username || '', email: full.data.user.email || '' });
            setProfilePic(full.data.user.profilePic || null);
            await AsyncStorage.setItem('user', JSON.stringify(full.data.user));
          } else if (parsed.guest) {
            setUser(parsed);
          } else {
            await AsyncStorage.removeItem('user'); await AsyncStorage.removeItem('token'); setUser(null);
          }
        }
      } catch (e) {
        console.error('Auth check error:', e);
        showMessage('Failed to load user data', 'error');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => () => { if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current); }, []);


  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; }
    setError(''); setSuccessMessage('');
  };
  const handleEditInputChange = (field, value) => {
    setEditFormData({ ...editFormData, [field]: value });
    if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; }
    setError(''); setSuccessMessage('');
  };

  const validateForm = () => {
    const { username, email, password, confirmPassword } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formType === 'login') {
      if (!email.trim() || !password.trim()) { showMessage('Please fill in all fields', 'error'); return false; }
      if (!emailRegex.test(email)) { showMessage('Invalid email format', 'error'); return false; }
    } else {
      if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) { showMessage('Please fill in all fields', 'error'); return false; }
      if (!emailRegex.test(email)) { showMessage('Invalid email format', 'error'); return false; }
      if (password.length < 6) { showMessage('Password must be at least 6 characters', 'error'); return false; }
      if (password !== confirmPassword) { showMessage('Passwords do not match', 'error'); return false; }
    }
    return true;
  };

  const validateEditForm = () => {
    const { username, email } = editFormData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!username.trim() || !email.trim()) { showMessage('Please fill in all fields', 'error'); return false; }
    if (!emailRegex.test(email)) { showMessage('Invalid email format', 'error'); return false; }
    return true;
  };

  const handleUpdate = async () => {
  if (!validateEditForm()) return;
  setLoading(true);
  try {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.put(`${API_URL}/user`, editFormData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(res.data.user);
    setEditMode(false);
    await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    showMessage('Profile updated', 'success');
  } catch (e) {
    console.error('Update profile error:', e);
    showMessage(e.response?.data?.message || 'Failed to update profile', 'error');
  } finally {
    setLoading(false);
  }
};


  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const endpoint = formType === 'login' ? `${API_URL}/login` : `${API_URL}/signup`;
      const payload = formType === 'login'
        ? { email: formData.email, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };
      const res = await axios.post(endpoint, payload);
      if (formType === 'signup') {
        showMessage('Account created successfully! Please login.', 'success');
        setFormType('login');
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
      } else {
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        await AsyncStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        setEditFormData({ username: res.data.user.username || '', email: res.data.user.email || '' });
        setProfilePic(res.data.user.profilePic || null);
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
        showMessage('Welcome back!', 'success');
      }
    } catch (e) {
      console.error(`${formType} error:`, e);
      showMessage(e.response?.data?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify({ guest: true, username: 'Guest' }));
      setUser({ guest: true, username: 'Guest' });
    } catch (e) {
      console.error('Guest error:', e);
      showMessage('Navigation failed, please try again', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user'); await AsyncStorage.removeItem('token');
      setUser(null);
      if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; }
      setError(''); setSuccessMessage(''); setEditMode(false); setProfilePic(null);
    } catch (e) {
      console.error('Logout error:', e);
      showMessage('Failed to logout, please try again', 'error');
    }
  };

  const handleChangeProfilePic = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    showMessage('Permission to access media library denied', 'error');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });

  if (result.canceled) return;

  // newer API: assets is an array
  const asset = result.assets && result.assets[0];
  if (!asset || !asset.uri) {
    showMessage('Failed to pick image', 'error');
    return;
  }

  setLoading(true);
  try {
    const token = await AsyncStorage.getItem('token');

    const form = new FormData();
    // On Android the uri will typically work fine. Name & type are required.
    form.append('profilePic', {
      uri: asset.uri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    });

    const res = await axios.post(`${API_URL}/upload-profile-pic`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    // backend returns path like /Uploads/xxx
    const returnedPath = res.data.profilePic;
    const fullUrl = `${API_BASE}${returnedPath}`;

    setProfilePic(returnedPath); // keep server path in state too if you want
    setUser((prev) => ({ ...prev, profilePic: returnedPath }));
    // Save full user to AsyncStorage (store server path, or fullUrl if you prefer)
    await AsyncStorage.setItem('user', JSON.stringify({ ...user, profilePic: returnedPath }));

    showMessage('Profile picture updated successfully', 'success');
  } catch (e) {
    console.error('Upload error:', e);
    showMessage('Failed to update profile picture', 'error');
  } finally {
    setLoading(false);
  }
};

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AAAAAA" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const elo = user?.elo;

  const games = user?.matchesPlayed ?? 0;
  const wins = user?.matchesWon ?? 0;
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
  const grade =
  winRate > 90 ? "A++" :
  winRate > 80 ? "A+" :
  winRate > 60 ? "A" :
  winRate > 50 ? "B++" :
  winRate > 30 ? "B+" :
  winRate > 25 ? "b" :
  "C";


const rate = { [grade]: true };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Gradient Header */}
        <LinearGradient colors={['#111214', '#0F0F0F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <Text style={styles.appTitle}>ChessMate</Text>
          <Text style={styles.appSubtitle}>Connect • Play • Master</Text>
        </LinearGradient>

        {/* Messages */}
        {error ? (<View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>) : null}
        {successMessage ? (<View style={styles.successContainer}><Text style={styles.successText}>{successMessage}</Text></View>) : null}

        {user ? (
          <>
            {/* Top bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() =>{playClick(), router.push('/')}} activeOpacity={0.85}>
                <LinearGradient colors={['#1E1E1E', '#151515']} style={styles.topBarBtn}><Text style={styles.topBarBtnText}>← Home</Text></LinearGradient>
              </TouchableOpacity>
              <Text style={styles.topBarTitle}>My Account</Text>
              <TouchableOpacity onPress={()=>{playClick(),handleLogout()}} activeOpacity={0.85}>
                <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.topBarBtn}><Text style={styles.topBarBtnText}>Logout</Text></LinearGradient>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollableContent} contentContainerStyle={styles.scrollContainer}>
              {/* Avatar Card */}
              {!user.guest && (
                <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.cardOuter}>
                  <View style={styles.cardInner}>
                    <View style={styles.avatarWrap}>
                      {profilePic ? (
                         <Image source={{ uri: `${API_BASE}${profilePic}` }} style={styles.profilePic} />
                      ) : (
                        <View style={styles.placeholderPic}><Text style={styles.placeholderText}>{user?.username[0]?.toUpperCase() || 'U'}</Text></View>
                      )}
                    </View>
                    <TouchableOpacity onPress={()=>{playClick(),handleChangeProfilePic()}} activeOpacity={0.9}>
                      <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.primaryBtn}>
                        <Text style={styles.primaryBtnText}>Upload New Photo</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              )}

              {/* Quick Links */}
              <View style={styles.quickLinksRow}>
                <TouchableOpacity onPress={() =>{playClick(), router.push('/setting')}} activeOpacity={0.9} style={{ flex: 1 }}>
                  <LinearGradient colors={['#1F1F1F', '#161616']} style={styles.quickLink}><Text style={styles.quickLinkText}>⚙️ Settings</Text></LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() =>{playClick(), router.push('/Items')}} activeOpacity={0.9} style={{ flex: 1 }}>
                  <LinearGradient colors={['#1F1F1F', '#161616']} style={styles.quickLink}><Text style={styles.quickLinkText}>🎒 Items</Text></LinearGradient>
                </TouchableOpacity>
                  <TouchableOpacity onPress={() =>{playClick(), router.push('/Friend')}} activeOpacity={0.9} style={{ flex: 1 }}>
                  <LinearGradient colors={['#1F1F1F', '#161616']} style={styles.quickLink}><Text style={styles.quickLinkText}>👥 Friends</Text></LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Profile Info */}
              <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.cardOuter}>
                <View style={styles.cardInner}>
                  <Text style={styles.sectionTitle}>Profile</Text>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Username</Text><Text style={styles.infoValue}>{user?.username || 'N/A'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{user?.email || 'N/A'}</Text></View>
                </View>
              </LinearGradient>

              {/* Stat Chips */}
              <View style={styles.statsRow}>
                <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.statChip}><Text style={styles.statTitle}>ELO</Text><Text style={styles.statValue}>{elo}</Text></LinearGradient>
                <LinearGradient colors={['#45B7D1', '#6BC5D1']} style={styles.statChip}><Text style={styles.statTitle}>Points</Text><Text style={styles.statValue}>{grade}</Text></LinearGradient>
                <LinearGradient colors={['#9B59B6', '#B569C6']} style={styles.statChip}><Text style={styles.statTitle}>Win %</Text><Text style={styles.statValue}>{winRate}%</Text></LinearGradient>
              </View>

              {/* Extended Stats */}
              <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.cardOuter}>
                <View style={styles.cardInner}>
                  <Text style={styles.sectionTitle}>Game Statistics</Text>
                  <View style={styles.grid}>
                    <View style={styles.gridItem}><Text style={styles.gridNumber}>{games}</Text><Text style={styles.gridLabel}>Games</Text></View>
                    <View style={styles.gridItem}><Text style={styles.gridNumber}>{wins}</Text><Text style={styles.gridLabel}>Wins</Text></View>
                    <View style={styles.gridItem}><Text style={styles.gridNumber}>{winRate}%</Text><Text style={styles.gridLabel}>Win Rate</Text></View>
                  </View>
                </View>
              </LinearGradient>

              {/* Edit Card */}
              {!user.guest && (
                <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.cardOuter}>
                  <View style={styles.cardInner}>
                    {editMode ? (
                      <>
                        <Text style={styles.sectionTitle}>Edit Profile</Text>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Username</Text><TextInput style={styles.input} value={editFormData.username} onChangeText={(v) => handleEditInputChange('username', v)} placeholder="Enter username" placeholderTextColor="#888" autoCapitalize="none" /></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Email</Text><TextInput style={styles.input} value={editFormData.email} onChangeText={(v) => handleEditInputChange('email', v)} placeholder="Enter email" placeholderTextColor="#888" autoCapitalize="none" keyboardType="email-address" /></View>
                        <TouchableOpacity onPress={()=>{playClick(),handleUpdate()}} activeOpacity={0.9}>
                          <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Save Changes</Text></LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() =>{playClick(), setEditMode(false)}} activeOpacity={0.85} style={{ marginTop: 10 }}>
                          <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>Cancel</Text></LinearGradient>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity onPress={() =>{playClick(), setEditMode(true)}} activeOpacity={0.9}>
                        <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Edit Profile</Text></LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              )}

              {/* Guest Note */}
              {user.guest && (
                <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.cardOuter}>
                  <View style={styles.cardInner}><Text style={styles.guestNote}>Playing as Guest with limited features</Text></View>
                </LinearGradient>
              )}
            </ScrollView>
          </>
        ) : (
          <>
            {/* Toggle */}
            <View style={styles.toggleWrap}>
              <TouchableOpacity onPress={() => {playClick(), setFormType('login'); if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; } setError(''); setSuccessMessage(''); setFormData({ username: '', email: '', password: '', confirmPassword: '' }); }} style={[styles.toggleBtn, formType === 'login' && styles.toggleActive]}>
                <Text style={[styles.toggleText, formType === 'login' && styles.toggleTextActive]}>🔐 Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {playClick(), setFormType('signup'); if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; } setError(''); setSuccessMessage(''); setFormData({ username: '', email: '', password: '', confirmPassword: '' }); }} style={[styles.toggleBtn, formType === 'signup' && styles.toggleActive]}>
                <Text style={[styles.toggleText, formType === 'signup' && styles.toggleTextActive]}>📝 Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Auth form */}
            <ScrollView style={styles.authScrollView} contentContainerStyle={styles.authScrollContainer}>
              <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.cardOuter}>
                <View style={styles.cardInner}>
                  {formType === 'signup' && (
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>👤 Username</Text><TextInput style={styles.input} value={formData.username} onChangeText={(v) => handleInputChange('username', v)} placeholder="Enter your username" placeholderTextColor="#888" autoCapitalize="none" /></View>
                  )}
                  <View style={styles.inputGroup}><Text style={styles.inputLabel}>📧 Email</Text><TextInput style={styles.input} value={formData.email} onChangeText={(v) => handleInputChange('email', v)} placeholder="Enter your email" placeholderTextColor="#888" keyboardType="email-address" autoCapitalize="none" /></View>
                  <View style={styles.inputGroup}><Text style={styles.inputLabel}>🔒 Password</Text><TextInput style={styles.input} value={formData.password} onChangeText={(v) => handleInputChange('password', v)} placeholder="Enter your password" placeholderTextColor="#888" secureTextEntry /></View>
                  {formType === 'signup' && (<View style={styles.inputGroup}><Text style={styles.inputLabel}>🔒 Confirm Password</Text><TextInput style={styles.input} value={formData.confirmPassword} onChangeText={(v) => handleInputChange('confirmPassword', v)} placeholder="Confirm password" placeholderTextColor="#888" secureTextEntry /></View>)}

                  <TouchableOpacity onPress={()=>{playClick(),handleSubmit()}} activeOpacity={0.9}>
                    <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>{formType === 'login' ? '🚀 Login' : '✨ Create Account'}</Text></LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={()=>{playClick(),handleGuest()}} activeOpacity={0.9} style={{ marginTop: 12 }}>
                    <LinearGradient colors={['#1F1F1F', '#161616']} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>👤 Continue as Guest</Text></LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 35, backgroundColor: '#0F0F0F' },
  keyboardAvoidingView: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  appTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: 'bold', marginBottom: 6 },
  appSubtitle: { color: '#AAAAAA', fontSize: 14, fontWeight: '500' },

  errorContainer: { backgroundColor: '#AA0000', padding: 12, marginHorizontal: 16, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#330' },
  errorText: { color: '#FFF', textAlign: 'center', fontSize: 13, fontWeight: '600' },
  successContainer: { backgroundColor: '#1C1C1C', padding: 12, marginHorizontal: 16, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  successText: { color: '#EDEDED', textAlign: 'center', fontSize: 13, fontWeight: '600' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topBarBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#2E2E2E' },
  topBarBtnText: { color: '#EDEDED', fontSize: 12, fontWeight: '700' },
  topBarTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  scrollableContent: { flex: 1 },
  scrollContainer: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 6 },

  cardOuter: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  cardInner: { padding: 14, backgroundColor: '#171717' },

  avatarWrap: { alignItems: 'center', marginBottom: 12 },
  profilePic: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#444' },
  placeholderPic: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#444' },
  placeholderText: { color: '#FFFFFF', fontSize: 46, fontWeight: '800' },

  primaryBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#0B0B0B', fontWeight: '800' },
  secondaryBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  secondaryBtnText: { color: '#EDEDED', fontWeight: '700' },

  quickLinksRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  quickLink: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  quickLinkText: { color: '#FFFFFF', fontWeight: '800' },

  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  infoLabel: { color: '#AAAAAA', fontSize: 13, fontWeight: '600' },
  infoValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statChip: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statTitle: { color: 'rgba(0,0,0,0.7)', fontWeight: '800', fontSize: 12 },
  statValue: { color: '#0B0B0B', fontWeight: '900', fontSize: 18, marginTop: 3 },

  grid: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  gridItem: { alignItems: 'center', paddingVertical: 6 },
  gridNumber: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  gridLabel: { color: '#AAAAAA', fontSize: 12, marginTop: 4 },

  inputGroup: { marginTop: 6, marginBottom: 10 },
  inputLabel: { color: '#EDEDED', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#222', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', borderWidth: 1, borderColor: '#333' },

  toggleWrap: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, backgroundColor: '#151515', borderRadius: 14, padding: 5, borderWidth: 1, borderColor: '#2A2A2A' },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  toggleActive: { backgroundColor: '#262626' },
  toggleText: { color: '#AAAAAA', fontWeight: '700' },
  toggleTextActive: { color: '#FFFFFF' },

  authScrollView: { flex: 1 },
  authScrollContainer: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#AAAAAA', fontSize: 16, marginTop: 12 },
});
