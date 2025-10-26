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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { ClickSoundContext } from './clickSound';
import { Ionicons } from '@expo/vector-icons';
import { useAuthLoading } from '../src/contexts/AuthLoadingContext';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://chessmate-backend-lfxo.onrender.com/api';


// Responsive calculations
const isTablet = width > 768;
const isSmallScreen = height < 700;
const isLargeScreen = height > 800;

// Global cache for user data
let userDataCache = null;
let isRefreshing = false;

export default function AuthPage() {
  const router = useRouter();
  const clickSoundContext = React.useContext(ClickSoundContext);
  const { setAuthLoading } = useAuthLoading();

  const [formType, setFormType] = useState('login');
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [backPressedOnce, setBackPressedOnce] = useState(false);
  const [user, setUser] = useState(userDataCache); // Initialize with cached data
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({ username: '', email: '' });
  const [profilePic, setProfilePic] = useState(null);

  const messageTimeoutRef = useRef(null);

  const showMessage = (message, type) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    if (type === 'error') { setError(message); setSuccessMessage(''); } else { setSuccessMessage(message); setError(''); }
    messageTimeoutRef.current = setTimeout(() => { setError(''); setSuccessMessage(''); messageTimeoutRef.current = null; }, 3000);
  };

  // Function to refresh user data in background
  const refreshUserData = async (showLoading = false) => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes
    
    try {
      isRefreshing = true;
      if (showLoading) setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        const parsed = JSON.parse(userData);
        const tokenRes = await axios.get(`${API_URL}/verify-token`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        if (tokenRes.data.valid) {
          const full = await axios.get(`${API_URL}/user`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          
          // Update cache and state
          userDataCache = full.data.user;
          setUser(full.data.user);
          setEditFormData({ 
            username: full.data.user.username || '', 
            email: full.data.user.email || '' 
          });
          setProfilePic(full.data.user.profilePic || null);
          await AsyncStorage.setItem('user', JSON.stringify(full.data.user));
        } else {
          userDataCache = null;
          await AsyncStorage.removeItem('user'); 
          await AsyncStorage.removeItem('token'); 
          setUser(null);
        }
      } else {
        // No token or user data, ensure user is null
        userDataCache = null;
        setUser(null);
      }
    } catch (e) {
      console.error('Background refresh error:', e);
      // Don't show error for background refresh
    } finally {
      isRefreshing = false;
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const initializeUserData = async () => {
      // If we have cached data, show it immediately and refresh in background
      if (userDataCache) {
        setUser(userDataCache);
        setEditFormData({ 
          username: userDataCache.username || '', 
          email: userDataCache.email || '' 
        });
        setProfilePic(userDataCache.profilePic || null);
        
        // Refresh data in background without showing loading
        refreshUserData(false);
      } else {
        // No cached data, show loading and fetch data
        refreshUserData(true);
      }
    };
    
    initializeUserData();
  }, []);

  // Refresh data when user navigates back to this page
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we already have user data (not on initial load) and user is not null
      if (userDataCache && user && user !== null) {
        refreshUserData(false);
      }
    }, [user])
  );

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
  setUpdatingProfile(true);
  try {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.put(`${API_URL}/user`, editFormData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    userDataCache = res.data.user; // Update cache
    setUser(res.data.user);
    setEditMode(false);
    await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    showMessage('Profile updated', 'success');
  } catch (e) {
    console.error('Update profile error:', e);
    showMessage(e.response?.data?.message || 'Failed to update profile', 'error');
  } finally {
    setUpdatingProfile(false);
  }
};


  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setAuthLoading(true); // Disable navigation during auth process
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
        userDataCache = res.data.user; // Update cache
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
      setAuthLoading(false); // Re-enable navigation after auth process
    }
  };


  const handleLogout = async () => {
    try {
      // Clear all user data
      await AsyncStorage.removeItem('user'); 
      await AsyncStorage.removeItem('token');
      
      // Clear cache
      userDataCache = null;
      
      // Reset all state
      setUser(null);
      setEditMode(false);
      setProfilePic(null);
      setError('');
      setSuccessMessage('');
      
      // Clear any pending timeouts
      if (messageTimeoutRef.current) { 
        clearTimeout(messageTimeoutRef.current); 
        messageTimeoutRef.current = null; 
      }
      
      // Navigate to home page after logout
      router.push('/User?formType=login');
      
      console.log('Logout successful');
    } catch (e) {
      console.error('Logout error:', e);
      showMessage('Failed to logout, please try again', 'error');
    }
  };



  if (loading && !user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>
            {formType === 'login' ? 'Logging in please wait...' : 'Creating account...'}
          </Text>
          <View style={styles.loadingDots}>
            <Text style={[styles.loadingDot, { opacity: 0.3 }]}>.</Text>
            <Text style={[styles.loadingDot, { opacity: 0.6 }]}>.</Text>
            <Text style={[styles.loadingDot, { opacity: 1.0 }]}>.</Text>
          </View>
        </View>
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
              <TouchableOpacity onPress={async ()=>{await clickSoundContext?.playClick?.(), router.push('/')}} activeOpacity={0.85}>
                <LinearGradient colors={['#1E1E1E', '#151515']} style={styles.topBarBtn}><Text style={styles.topBarBtnText}>← Home</Text></LinearGradient>
              </TouchableOpacity>
              <Text style={styles.topBarTitle}>My Account</Text>
              <TouchableOpacity onPress={async ()=>{await clickSoundContext?.playClick?.(), handleLogout()}} activeOpacity={0.85}>
                <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.topBarBtn}><Text style={styles.topBarBtnText}>Logout</Text></LinearGradient>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollableContent} contentContainerStyle={styles.scrollContainer}>
              {/* Avatar Card */}
              {user && (
                <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.cardOuter}>
                  <View style={styles.cardInner}>
                    <View style={styles.avatarWrap}>
                      {profilePic ? (
                         <Image source={{ uri: `${API_URL}${profilePic}` }} style={styles.profilePic} />
                      ) : (
                        <View style={styles.placeholderPic}><Text style={styles.placeholderText}>{user?.username[0]?.toUpperCase() || 'U'}</Text></View>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              )}

              {/* Quick Links */}
              <View style={styles.quickLinksRow}>
                <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.push('/setting')}} activeOpacity={0.9} style={{ flex: 1 }}>
                  <LinearGradient colors={['#1F1F1F', '#161616']} style={styles.quickLink}><Text style={styles.quickLinkText}>⚙️ Settings</Text></LinearGradient>
                </TouchableOpacity>
                {/* <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.push('/Items')}} activeOpacity={0.9} style={{ flex: 1 }}>
                  <LinearGradient colors={['#1F1F1F', '#161616']} style={styles.quickLink}><Text style={styles.quickLinkText}>🎒 Items</Text></LinearGradient>
                </TouchableOpacity> */}
                  <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.push('/Friend')}} activeOpacity={0.9} style={{ flex: 1 }}>
                  <LinearGradient colors={['#1F1F1F', '#161616']} style={styles.quickLink}>
                    <View style={styles.quickLinkContent}>
                      <Ionicons name="people" size={16} color="#FFFFFF" />
                      <Text style={styles.quickLinkText}>Friends</Text>
                    </View>
                  </LinearGradient>
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
              {user && (
                <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.cardOuter}>
                  <View style={styles.cardInner}>
                    {editMode ? (
                      <>
                        <Text style={styles.sectionTitle}>Edit Profile</Text>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Username</Text><TextInput style={styles.input} value={editFormData.username} onChangeText={(v) => handleEditInputChange('username', v)} placeholder="Enter username" placeholderTextColor="#888" autoCapitalize="none" /></View>
                        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Email</Text><TextInput style={styles.input} value={editFormData.email} onChangeText={(v) => handleEditInputChange('email', v)} placeholder="Enter email" placeholderTextColor="#888" autoCapitalize="none" keyboardType="email-address" /></View>
                        <TouchableOpacity 
                          onPress={async ()=>{await clickSoundContext?.playClick?.(), handleUpdate()}} 
                          activeOpacity={0.9}
                          disabled={updatingProfile}
                        >
                          <LinearGradient colors={updatingProfile ? ['#666', '#555'] : ['#4ECDC4', '#6BCEC4']} style={[styles.primaryBtn, updatingProfile && styles.disabledBtn]}>
                            <Text style={styles.primaryBtnText}>
                              {updatingProfile ? 'Updating...' : 'Save Changes'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), setEditMode(false)}} activeOpacity={0.85} style={{ marginTop: 10 }}>
                          <LinearGradient colors={['#2A2A2A', '#1A1A1A']} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>Cancel</Text></LinearGradient>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), setEditMode(true)}} activeOpacity={0.9}>
                        <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Edit Profile</Text></LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              )}

            </ScrollView>
          </>
        ) : (
          <>
            {/* Toggle */}
            <View style={styles.toggleWrap}>
              <TouchableOpacity onPress={() => {clickSoundContext?.playClick?.(), setFormType('login'); if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; } setError(''); setSuccessMessage(''); setFormData({ username: '', email: '', password: '', confirmPassword: '' }); }} style={[styles.toggleBtn, formType === 'login' && styles.toggleActive]}>
                <Text style={[styles.toggleText, formType === 'login' && styles.toggleTextActive]}>🔐 Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {clickSoundContext?.playClick?.(), setFormType('signup'); if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; } setError(''); setSuccessMessage(''); setFormData({ username: '', email: '', password: '', confirmPassword: '' }); }} style={[styles.toggleBtn, formType === 'signup' && styles.toggleActive]}>
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

                  <TouchableOpacity onPress={()=>{clickSoundContext?.playClick?.(),handleSubmit()}} activeOpacity={0.9}>
                    <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>{formType === 'login' ? '🚀 Login' : '✨ Create Account'}</Text></LinearGradient>
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
  container: { flex: 1, backgroundColor: '#0F0F0F',paddingTop: 30, },
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
  disabledBtn: { opacity: 0.6 },
  secondaryBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  secondaryBtnText: { color: '#EDEDED', fontWeight: '700' },

  quickLinksRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  quickLink: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  quickLinkText: { color: '#FFFFFF', fontWeight: '800' },
  quickLinkContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 6
  },

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

  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#0F0F0F'
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center'
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    color: '#4ECDC4',
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 2,
  },


});
