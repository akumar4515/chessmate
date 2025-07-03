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
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

export default function UserDetails() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [profilePic, setProfilePic] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://192.168.243.45:3000/api';

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        if (token && userData) {
          const response = await axios.get(`${API_URL}/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const user = response.data.user;
          setUser(user);
          setFormData({ username: user.username || '', email: user.email || '' });
          setProfilePic(user.profilePic || null);
        } else {
          navigation.navigate('AuthPage'); // Redirect to login if no token/user
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigation]);

  // Handle input changes for edit form
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
    setSuccessMessage('');
  };

  // Validate form data
  const validateForm = () => {
    const { username, email } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!username.trim() || !email.trim()) return setError('Please fill in all fields') || false;
    if (!emailRegex.test(email)) return setError('Invalid email format') || false;
    return true;
  };

  // Handle form submission for updating user details
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

  // Handle logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      setUser(null);
      navigation.navigate('AuthPage');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout, please try again');
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
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.formContainer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          {/* Profile Picture */}
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

          {/* User Details */}
          <View style={styles.userInfoContainer}>
            {editMode ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#999"
                  value={formData.username}
                  onChangeText={(v) => handleInputChange('username', v)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(v) => handleInputChange('email', v)}
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
            <TouchableOpacity style={styles.buttonWrapper} onPress={() => navigation.navigate('index')}>
              <LinearGradient colors={['#1976D2', '#0288D1']} style={styles.button}>
                <Text style={styles.buttonText}>Go to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
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
  userInfoContainer: {
    marginBottom: height * 0.03,
  },
  userInfoText: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.05, 18),
    fontWeight: '600',
    marginVertical: height * 0.01,
    textAlign: 'center',
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