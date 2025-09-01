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
  Image,
  ActivityIndicator,
  StatusBar,
  Animated,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

export default function UserDetail() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [profilePic, setProfilePic] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmLogoutModal, setConfirmLogoutModal] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const API_URL = 'https://chessmate-backend-lfxo.onrender.com/api';

  useEffect(() => {
    initializeAnimations();
    fetchUserData();
  }, []);

  const initializeAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (token && userData) {
        const response = await axios.get(`${API_URL}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userInfo = response.data.user;
        setUser(userInfo);
        setFormData({ username: userInfo.username || '', email: userInfo.email || '' });
        setProfilePic(userInfo.profilePic || null);
      } else {
        navigation.navigate('User');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
      showMessage('Failed to load user data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
    setSuccessMessage('');
  };

  const validateForm = () => {
    const { username, email } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!username.trim() || !email.trim()) {
      showMessage('Please fill in all fields', 'error');
      shakeAnimation();
      return false;
    }
    if (!emailRegex.test(email)) {
      showMessage('Invalid email format', 'error');
      shakeAnimation();
      return false;
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/user`,
        { username: formData.username, email: formData.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser(response.data.user);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      showMessage('Profile updated successfully', 'success');
      setEditMode(false);
    } catch (err) {
      console.error('Update error:', err);
      showMessage(err.response?.data?.message || 'Failed to update profile', 'error');
      shakeAnimation();
    } finally {
      setLoading(false);
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
      quality: 1,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const formData = new FormData();
        formData.append('profilePic', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });

        const response = await axios.post(`${API_URL}/upload-profile-pic`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        setProfilePic(response.data.profilePic);
        setUser((prev) => ({ ...prev, profilePic: response.data.profilePic }));
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, profilePic: response.data.profilePic }));
        showMessage('Profile picture updated successfully', 'success');
      } catch (err) {
        console.error('Profile picture upload error:', err);
        showMessage('Failed to update profile picture', 'error');
        shakeAnimation();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      setUser(null);
      setConfirmLogoutModal(false);
      navigation.navigate('User');
    } catch (err) {
      console.error('Logout error:', err);
      showMessage('Failed to logout, please try again', 'error');
    }
  };

  const showMessage = (message, type) => {
    if (type === 'error') {
      setError(message);
      setSuccessMessage('');
    } else {
      setSuccessMessage(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccessMessage('');
    }, 3000);
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>Profile Details</Text>
      
      <TouchableOpacity style={styles.logoutIconButton} onPress={() => setConfirmLogoutModal(true)}>
        <Ionicons name="log-out-outline" size={24} color="#FF4444" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderMessage = () => {
    if (!error && !successMessage) return null;
    
    return (
      <Animated.View style={[
        styles.messageContainer,
        { 
          opacity: fadeAnim, 
          transform: [{ translateX: shakeAnim }],
          backgroundColor: error ? '#AA0000' : '#333333'
        }
      ]}>
        <View style={styles.messageContent}>
          <Ionicons 
            name={error ? 'alert-circle' : 'checkmark-circle'} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.messageText}>{error || successMessage}</Text>
        </View>
      </Animated.View>
    );
  };

  const renderProfilePicture = () => (
    <Animated.View style={[styles.profilePicSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity 
        style={styles.profilePicContainer}
        onPress={handleChangeProfilePic}
      >
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.profilePic} />
        ) : (
          <View style={styles.placeholderPic}>
            <Text style={styles.placeholderText}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View style={styles.cameraOverlay}>
          <Ionicons name="camera" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.changePicButton} onPress={handleChangeProfilePic}>
        <Text style={styles.changePicText}>Change Profile Picture</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderUserStats = () => (
    <Animated.View style={[styles.statsSection, { opacity: fadeAnim }]}>
      <View style={styles.statsContent}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="stats-chart" size={20} color="#FFFFFF" /> Game Statistics
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <Ionicons name="game-controller" size={30} color="#FFFFFF" />
              <Text style={styles.statNumber}>{user?.matchesPlayed || 0}</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <Ionicons name="trophy" size={30} color="#FFFFFF" />
              <Text style={styles.statNumber}>{user?.matchesWon || 0}</Text>
              <Text style={styles.statLabel}>Games Won</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <Ionicons name="trending-up" size={30} color="#FFFFFF" />
              <Text style={styles.statNumber}>
                {user?.matchesPlayed > 0 ? Math.round((user?.matchesWon / user?.matchesPlayed) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <Ionicons name="time" size={30} color="#FFFFFF" />
              <Text style={styles.statNumber}>{user?.matchesPlayed - user?.matchesWon || 0}</Text>
              <Text style={styles.statLabel}>Games Lost</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderUserInfo = () => (
    <Animated.View style={[styles.userInfoSection, { opacity: fadeAnim }]}>
      <View style={styles.userInfoContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="person" size={20} color="#FFFFFF" /> Personal Information
          </Text>
          {!editMode && (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {editMode ? (
          <View style={styles.editForm}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#AAAAAA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#AAAAAA"
                value={formData.username}
                onChangeText={(v) => handleInputChange('username', v)}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#AAAAAA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#AAAAAA"
                value={formData.email}
                onChangeText={(v) => handleInputChange('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={loading}>
                <View style={styles.saveButtonContent}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditMode(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.userDetails}>
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Username</Text>
                <Text style={styles.detailValue}>{user?.username || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="mail" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{user?.email || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Member Since</Text>
                <Text style={styles.detailValue}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderQuickActions = () => (
    <Animated.View style={[styles.actionsSection, { opacity: fadeAnim }]}>
      <View style={styles.actionsContent}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="settings" size={20} color="#FFFFFF" /> Quick Actions
        </Text>
        
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('index')}>
          <View style={styles.actionIcon}>
            <Ionicons name="home" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Go to Home</Text>
            <Text style={styles.actionSubtitle}>Return to main screen</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Friend')}>
          <View style={styles.actionIcon}>
            <Ionicons name="people" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Friends</Text>
            <Text style={styles.actionSubtitle}>Manage your friends list</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => setConfirmLogoutModal(true)}>
          <View style={styles.actionIcon}>
            <Ionicons name="log-out" size={24} color="#FF4444" />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: '#FF4444' }]}>Logout</Text>
            <Text style={styles.actionSubtitle}>Sign out of your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#AAAAAA" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderHeader()}
        {renderMessage()}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderProfilePicture()}
          {renderUserStats()}
          {renderUserInfo()}
          {renderQuickActions()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={confirmLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmLogoutModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.logoutModal, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="log-out-outline" size={50} color="#FF4444" />
            <Text style={styles.logoutModalTitle}>Confirm Logout</Text>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout? You'll need to login again to access your account.
            </Text>
            
            <View style={styles.logoutModalActions}>
              <TouchableOpacity style={styles.logoutConfirmButton} onPress={handleLogout}>
                <View style={styles.logoutConfirmContent}>
                  <Text style={styles.logoutConfirmText}>Logout</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logoutCancelButton} 
                onPress={() => setConfirmLogoutModal(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
     paddingTop: 35,
    backgroundColor: '#000000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#AAAAAA',
    fontSize: 16,
    marginTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  messageContainer: {
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profilePicSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  profilePicContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profilePic: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#555555',
  },
  placeholderPic: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#555555',
    backgroundColor: '#1A1A1A',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: 'bold',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#555555',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  changePicButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#555555',
  },
  changePicText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 25,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  statsContent: {
    padding: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
  },
  statCardContent: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
    textAlign: 'center',
  },
  userInfoSection: {
    marginBottom: 25,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  userInfoContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  userDetails: {
    flex: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#333333',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#555555',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#555555',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editForm: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#555555',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  editActions: {
    marginTop: 20,
  },
  saveButton: {
    marginBottom: 15,
  },
  saveButtonContent: {
    backgroundColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#555555',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '500',
  },
  actionsSection: {
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionsContent: {
    padding: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#333333',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#555555',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#555555',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoutModal: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  logoutModalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  logoutModalMessage: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  logoutModalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  logoutConfirmButton: {
    flex: 1,
    marginRight: 10,
  },
  logoutConfirmContent: {
    backgroundColor: '#AA0000',
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  logoutConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
  },
  logoutCancelText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '600',
  },
});