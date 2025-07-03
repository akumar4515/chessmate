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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
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

  const API_URL = 'http://192.168.243.45:3000/api';

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
            // Fetch full user data for non-guest users
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
      if (!email.trim() || !password.trim()) return setError('Please fill in all fields') || false;
      if (!emailRegex.test(email)) return setError('Invalid email format') || false;
    } else {
      if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim())
        return setError('Please fill in all fields') || false;
      if (!emailRegex.test(email)) return setError('Invalid email format') || false;
      if (password.length < 6) return setError('Password must be at least 6 characters') || false;
      if (password !== confirmPassword) return setError('Passwords do not match') || false;
    }
    return true;
  };

  // Validate edit form
  const validateEditForm = () => {
    const { username, email } = editFormData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!username.trim() || !email.trim()) return setError('Please fill in all fields') || false;
    if (!emailRegex.test(email)) return setError('Invalid email format') || false;
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
        setSuccessMessage('Signup complete, please login');
        setFormType('login');
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
      } else {
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        setEditFormData({ username: response.data.user.username || '', email: response.data.user.email || '' });
        setProfilePic(response.data.user.profilePic || null);
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
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
      await AsyncStorage.setItem('user', JSON.stringify({ guest: true }));
      setUser({ guest: true });
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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1976D2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to ChessMate</Text>
        </View>

        <View style={styles.formContainer}>
          {user ? (
            <View style={styles.userInfoContainer}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

              {/* Profile Picture */}
              {user.guest ? null : (
                <View style={styles.profilePicContainer}>
                  {profilePic ? (
                    <Image source={{ uri: profilePic }} style={styles.profilePic} />
                  ) : (
                    <View style={styles.placeholderPic}>
                      <Text style={styles.placeholderText}>{user?.username?.[0]?.toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.changePicButton} onPress={handleChangeProfilePic} disabled={loading}>
                    <Text style={styles.changePicText}>Change Profile Picture</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* User Details */}
              <View style={styles.detailsContainer}>
                {user.guest ? (
                  <Text style={styles.userInfoText}>Guest User</Text>
                ) : editMode ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Username"
                      placeholderTextColor="#999"
                      value={editFormData.username}
                      onChangeText={(v) => handleEditInputChange('username', v)}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#999"
                      value={editFormData.email}
                      onChangeText={(v) => handleEditInputChange('email', v)}
                      keyboardType="email-address"
                    />
                    <TouchableOpacity style={styles.buttonWrapper} onPress={handleUpdate} disabled={loading}>
                      <LinearGradient colors={['#1976D2', '#0288D1']} style={styles.button}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setEditMode(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.userInfoText}>Username: {user?.username || 'N/A'}</Text>
                    <Text style={styles.userInfoText}>Email: {user?.email || 'N/A'}</Text>
                    <Text style={styles.userInfoText}>Matches Played: {user?.matchesPlayed || 0}</Text>
                    <Text style={styles.userInfoText}>Matches Won: {user?.matchesWon || 0}</Text>
                    <TouchableOpacity style={styles.buttonWrapper} onPress={() => setEditMode(true)}>
                      <LinearGradient colors={['#1976D2', '#0288D1']} style={styles.button}>
                        <Text style={styles.buttonText}>Edit Profile</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Navigation and Logout */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.toggleContainer}>
                {['login', 'signup'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.toggleButton, formType === type && styles.toggleButtonActive]}
                    onPress={() => {
                      setFormType(type);
                      setError('');
                      setSuccessMessage('');
                      setFormData({ username: '', email: '', password: '', confirmPassword: '' });
                    }}
                  >
                    <Text style={[styles.toggleText, formType === type && styles.toggleTextActive]}>
                      {type === 'login' ? 'Login' : 'Sign Up'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputsContainer}>
                {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
                {formType === 'signup' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#999"
                    value={formData.username}
                    onChangeText={(v) => handleInputChange('username', v)}
                  />
                )}
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(v) => handleInputChange('email', v)}
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={formData.password}
                  onChangeText={(v) => handleInputChange('password', v)}
                  secureTextEntry
                />
                {formType === 'signup' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    value={formData.confirmPassword}
                    onChangeText={(v) => handleInputChange('confirmPassword', v)}
                    secureTextEntry
                  />
                )}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.buttonWrapper} onPress={handleSubmit} disabled={loading}>
                  <LinearGradient colors={['#1976D2', '#0288D1']} style={styles.button}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{formType === 'login' ? 'Login' : 'Sign Up'}</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
                  <Text style={styles.guestText}>Continue as Guest</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: width * 0.1,
    paddingVertical: height * 0.06,
    alignItems: 'center',
  },
  title: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.07, 26),
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    width: '90%',
    alignSelf: 'center',
    paddingVertical: height * 0.02,
  },
  toggleContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#2A2A2A',
    borderRadius: 25,
    marginBottom: height * 0.03,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: height * 0.02,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#1C1C1C',
    borderBottomWidth: 2,
    borderColor: '#B76E79',
    transform: [{ scale: 1.03 }],
  },
  toggleText: {
    color: '#999',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#EDEDED',
  },
  inputsContainer: {
    marginBottom: height * 0.03,
    minHeight: height * 0.1,
  },
  input: {
    width: '100%',
    height: Math.min(height * 0.06, 50),
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    paddingHorizontal: width * 0.04,
    color: '#EDEDED',
    fontSize: Math.min(width * 0.04, 16),
    marginVertical: height * 0.02,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  errorText: {
    color: '#DC143C',
    fontSize: Math.min(width * 0.035, 14),
    marginVertical: height * 0.01,
    textAlign: 'center',
  },
  successText: {
    color: '#4CAF50',
    fontSize: Math.min(width * 0.035, 14),
    marginVertical: height * 0.01,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '100%',
    marginVertical: height * 0.02,
  },
  button: {
    height: Math.min(height * 0.05, 48),
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonText: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: '600',
  },
  guestButton: {
    marginTop: height * 0.03,
    alignItems: 'center',
  },
  guestText: {
    color: '#B76E79',
    fontSize: Math.min(width * 0.04, 15),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  userInfoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  userInfoText: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.05, 18),
    fontWeight: '600',
    marginVertical: height * 0.01,
    textAlign: 'center',
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: height * 0.03,
  },
  profilePic: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: width * 0.15,
    borderWidth: 2,
    borderColor: '#333',
  },
  placeholderPic: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: width * 0.15,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  placeholderText: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.1, 40),
    fontWeight: 'bold',
  },
  changePicButton: {
    marginTop: height * 0.02,
  },
  changePicText: {
    color: '#B76E79',
    fontSize: Math.min(width * 0.04, 15),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  detailsContainer: {
    marginBottom: height * 0.03,
    width: '100%',
  },
  cancelButton: {
    marginTop: height * 0.02,
    alignItems: 'center',
  },
  cancelText: {
    color: '#B76E79',
    fontSize: Math.min(width * 0.04, 15),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  logoutButton: {
    marginTop: height * 0.03,
    alignItems: 'center',
  },
  logoutText: {
    color: '#DC143C',
    fontSize: Math.min(width * 0.04, 15),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});