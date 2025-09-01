import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

export default function AuthPage() {
  const navigation = useNavigation();
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

  const API_URL = 'https://chessmate-backend-lfxo.onrender.com/api';

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          const response = await axios.get(`${API_URL}/verify-token`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.data.valid && !parsedUser.guest) {
            const userResponse = await axios.get(`${API_URL}/user`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const fullUser = userResponse.data.user;
            setUser(fullUser);
            setEditFormData({ username: fullUser.username || '', email: fullUser.email || '' });
            setProfilePic(fullUser.profilePic || null);
            await AsyncStorage.setItem('user', JSON.stringify(fullUser));
          } else if (parsedUser.guest) {
            setUser(parsedUser);
          } else {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
            setUser(null);
          }
        }
      } catch (err) {
        console.error('AsyncStorage or token verification error:', err);
        setError('Failed to load user data');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      if (backPressedOnce) {
        BackHandler.exitApp();
        return true;
      }
      
      setBackPressedOnce(true);
      setError('Press again to exit the app');
      setTimeout(() => setBackPressedOnce(false), 2000);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [backPressedOnce]);

  // Handle input changes for login/signup form
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
    setSuccessMessage('');
  };

  // Handle input changes for edit form
  const handleEditInputChange = (field, value) => {
    setEditFormData({ ...editFormData, [field]: value });
    setError('');
    setSuccessMessage('');
  };

  // Validate login/signup form
  const validateForm = () => {
    const { username, email, password, confirmPassword } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (formType === 'login') {
      if (!email.trim() || !password.trim()) {
        setError('Please fill in all fields');
        return false;
      }
      if (!emailRegex.test(email)) {
        setError('Invalid email format');
        return false;
      }
    } else {
      if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('Please fill in all fields');
        return false;
      }
      if (!emailRegex.test(email)) {
        setError('Invalid email format');
        return false;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }
    return true;
  };

  // Validate edit form
  const validateEditForm = () => {
    const { username, email } = editFormData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username.trim() || !email.trim()) {
      setError('Please fill in all fields');
      return false;
    }
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return false;
    }
    return true;
  };

  // Handle login/signup submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const endpoint = formType === 'login' ? `${API_URL}/login` : `${API_URL}/signup`;
      const payload = formType === 'login'
        ? { email: formData.email, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };

      const response = await axios.post(endpoint, payload);

      if (formType === 'signup') {
        setSuccessMessage('Account created successfully! Please login.');
        setFormType('login');
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
      } else {
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        setEditFormData({ username: response.data.user.username || '', email: response.data.user.email || '' });
        setProfilePic(response.data.user.profilePic || null);
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
        setSuccessMessage('Welcome back!');
      }
    } catch (err) {
      console.error(`${formType} error:`, err);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle guest login
  const handleGuest = async () => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify({ guest: true, username: 'Guest' }));
      setUser({ guest: true, username: 'Guest' });
    } catch (err) {
      console.error('Guest navigation error:', err);
      setError('Navigation failed, please try again');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      setUser(null);
      setError('');
      setSuccessMessage('');
      setEditMode(false);
      setProfilePic(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout, please try again');
    }
  };

  // Handle profile update
  const handleUpdate = async () => {
    if (!validateEditForm()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/user`,
        { username: editFormData.username, email: editFormData.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser(response.data.user);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      setSuccessMessage('Profile updated successfully');
      setEditMode(false);
    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle profile picture change
  const handleChangeProfilePic = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permission to access media library denied');
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
        const formDataUpload = new FormData();
        formDataUpload.append('profilePic', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });

        const response = await axios.post(`${API_URL}/upload-profile-pic`, formDataUpload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        setProfilePic(response.data.profilePic);
        setUser((prev) => ({ ...prev, profilePic: response.data.profilePic }));
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, profilePic: response.data.profilePic }));
        setSuccessMessage('Profile picture updated successfully');
      } catch (err) {
        console.error('Profile picture upload error:', err);
        setError('Failed to update profile picture');
      } finally {
        setLoading(false);
      }
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>ChessMate</Text>
          <Text style={styles.appSubtitle}>Connect • Play • Master</Text>
        </View>

        {/* Fixed Messages */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {user ? (
          <>
            {/* Fixed Navigation Header for Profile */}
            <View style={styles.profileHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('index')}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.profileTitle}>My Account</Text>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Profile Content */}
            <ScrollView style={styles.scrollableContent} contentContainerStyle={styles.scrollContainer}>
              {/* Profile Picture Section */}
              {!user.guest && (
                <View style={styles.profilePicSection}>
                  <View style={styles.profilePicContainer}>
                    {profilePic ? (
                      <Image source={{ uri: profilePic }} style={styles.profilePic} />
                    ) : (
                      <View style={styles.placeholderPic}>
                        <Text style={styles.placeholderText}>
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.changePicButton} onPress={handleChangeProfilePic}>
                    <Text style={styles.changePicText}>Change Profile Picture</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* User Information */}
              {user.guest ? (
                <View style={styles.guestInfo}>
                  <Text style={styles.guestTitle}>👤 Guest User</Text>
                  <Text style={styles.guestSubtext}>Playing as guest with limited features</Text>
                </View>
              ) : editMode ? (
                /* Edit Mode */
                <View style={styles.editContainer}>
                  <Text style={styles.sectionTitle}>✏️ Edit Profile</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.modernInput}
                      value={editFormData.username}
                      onChangeText={(v) => handleEditInputChange('username', v)}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.modernInput}
                      value={editFormData.email}
                      onChangeText={(v) => handleEditInputChange('email', v)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.editActions}>
                    {loading ? (
                      <ActivityIndicator size="large" color="#AAAAAA" />
                    ) : (
                      <TouchableOpacity style={[styles.solidButton, styles.saveButton]} onPress={handleUpdate}>
                        <Text style={styles.saveButtonText}>💾 Save Changes</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setEditMode(false)}>
                      <Text style={styles.cancelButtonText}>❌ Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Display Mode */
                <View style={styles.displayContainer}>
                  <Text style={styles.sectionTitle}>📋 Profile Information</Text>
                  
                  <View style={styles.infoCard}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>👤 Username:</Text>
                      <Text style={styles.infoValue}>{user?.username || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>📧 Email:</Text>
                      <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
                    </View>
                  </View>

                  {/* Game Statistics */}
                  <View style={styles.statsCard}>
                    <Text style={styles.statsTitle}>🎮 Game Statistics</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{user?.matchesPlayed || 0}</Text>
                        <Text style={styles.statLabel}>Games Played</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{user?.matchesWon || 0}</Text>
                        <Text style={styles.statLabel}>Games Won</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                          {user?.matchesPlayed > 0 ? Math.round((user?.matchesWon / user?.matchesPlayed) * 100) : 0}%
                        </Text>
                        <Text style={styles.statLabel}>Win Rate</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity style={[styles.solidButton, styles.editProfileButton]} onPress={() => setEditMode(true)}>
                    <Text style={styles.editProfileText}>✏️ Edit Profile</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </>
        ) : (
          <>
            {/* Fixed Form Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, formType === 'login' && styles.toggleButtonActive]}
                onPress={() => {
                  setFormType('login');
                  setError('');
                  setSuccessMessage('');
                  setFormData({ username: '', email: '', password: '', confirmPassword: '' });
                }}
              >
                <Text style={[styles.toggleText, formType === 'login' && styles.toggleTextActive]}>
                  🔐 Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleButton, formType === 'signup' && styles.toggleButtonActive]}
                onPress={() => {
                  setFormType('signup');
                  setError('');
                  setSuccessMessage('');
                  setFormData({ username: '', email: '', password: '', confirmPassword: '' });
                }}
              >
                <Text style={[styles.toggleText, formType === 'signup' && styles.toggleTextActive]}>
                  📝 Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Authentication Form Content */}
            <ScrollView style={styles.authScrollView} contentContainerStyle={styles.authScrollContainer}>
              <View style={styles.authContainer}>
                <View style={styles.formContainer}>
                  {/* Form Inputs */}
                  {formType === 'signup' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>👤 Username</Text>
                      <TextInput
                        style={styles.modernInput}
                        value={formData.username}
                        onChangeText={(v) => handleInputChange('username', v)}
                        autoCapitalize="none"
                      />
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>📧 Email</Text>
                    <TextInput
                      style={styles.modernInput}
                      value={formData.email}
                      onChangeText={(v) => handleInputChange('email', v)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>🔒 Password</Text>
                    <TextInput
                      style={styles.modernInput}
                      value={formData.password}
                      onChangeText={(v) => handleInputChange('password', v)}
                      secureTextEntry
                    />
                  </View>

                  {formType === 'signup' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>🔒 Confirm Password</Text>
                      <TextInput
                        style={styles.modernInput}
                        value={formData.confirmPassword}
                        onChangeText={(v) => handleInputChange('confirmPassword', v)}
                        secureTextEntry
                      />
                    </View>
                  )}

                  {/* Submit Button */}
                  {loading ? (
                    <ActivityIndicator size="large" color="#AAAAAA" />
                  ) : (
                    <TouchableOpacity style={[styles.solidButton, styles.submitButton]} onPress={handleSubmit}>
                      <Text style={styles.submitText}>
                        {formType === 'login' ? '🚀 Login' : '✨ Create Account'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Guest Option */}
                  <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
                    <Text style={styles.guestButtonText}>👤 Continue as Guest</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
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
  scrollableContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  authScrollView: {
    flex: 1,
  },
  authScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#AAAAAA',
    fontSize: 16,
    marginTop: 15,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appSubtitle: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#AA0000',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  successContainer: {
    backgroundColor: '#333333',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555555',
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profileTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#AA0000',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profilePicSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  profilePicContainer: {
    marginBottom: 15,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#555555',
  },
  placeholderPic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#555555',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  changePicButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#555555',
  },
  changePicText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  userInfoContainer: {
    flex: 1,
  },
  guestInfo: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  guestTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  guestSubtext: {
    color: '#AAAAAA',
    fontSize: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  editContainer: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  displayContainer: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoCard: {
    backgroundColor: '#333333',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#555555',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#555555',
  },
  infoLabel: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#333333',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#555555',
  },
  statsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modernInput: {
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#555555',
  },
  editActions: {
    marginTop: 10,
  },
  solidButton: {
    backgroundColor: '#333333',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  saveButton: {
    marginBottom: 15,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '500',
  },
  editProfileButton: {
    marginTop: 10,
  },
  editProfileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    padding: 5,
    marginBottom: 10,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    borderWidth: 1,
    borderColor: '#333333',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#333333',
  },
  toggleText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'start',
    minHeight: height - 350,
  },
  formContainer: {
    marginBottom: 30,
  },
  submitButton: {
    marginBottom: 20,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  guestButton: {
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#555555',
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
  },
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});