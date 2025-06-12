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
  Image, // Add Image here
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AuthPage() {
  const navigation = useNavigation();
  const [formType, setFormType] = useState('login'); // 'login' or 'signup'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  // Debug mount
  useEffect(() => {
    console.log('AuthPage component mounted, formType:', formType);
  }, []);

  // Back button handling
  useEffect(() => {
    const backAction = () => {
      setError('Press again to exit the app');
      return true; // Prevent default exit
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

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

  const handleSubmit = () => {
    if (validateForm()) {
      try {
        // Placeholder: Add backend auth logic here (e.g., Firebase)
        console.log(`${formType} submitted with:`, formData);
        navigation.navigate('Home'); // Replace with 'chessAi' if needed
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
      } catch (err) {
        console.error('Navigation error:', err);
        setError('Navigation failed, please try again');
      }
    }
  };

  const handleGoogleSignIn = () => {
    try {
      // Placeholder: Add Google sign-in logic
      console.log('Initiating Google Sign-In');
      navigation.navigate('Home');
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setError('Google Sign-In failed, please try again');
    }
  };

  const handleGuest = () => {
    try {
      navigation.navigate('Home');
    } catch (err) {
      console.error('Guest navigation error:', err);
      setError('Navigation failed, please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : height * 0.08}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to ChessMate</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Toggle Buttons */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, formType === 'login' && styles.toggleButtonActive]}
              onPress={() => {
                setFormType('login');
                setError('');
                setFormData({ username: '', email: '', password: '', confirmPassword: '' });
              }}
              accessibilityLabel="Switch to Login form"
            >
              <Text style={[styles.toggleText, formType === 'login' && styles.toggleTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, formType === 'signup' && styles.toggleButtonActive]}
              onPress={() => {
                setFormType('signup');
                setError('');
                setFormData({ username: '', email: '', password: '', confirmPassword: '' });
              }}
              accessibilityLabel="Switch to Signup form"
            >
              <Text style={[styles.toggleText, formType === 'signup' && styles.toggleTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Form Inputs */}
          <View style={styles.inputsContainer}>
            {formType === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#999"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                autoCapitalize="none"
                accessibilityLabel="Username input"
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Email input"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Password input"
            />
            {formType === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Confirm Password input"
              />
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={handleSubmit}
              accessibilityLabel={`Submit ${formType} form`}
            >
              <LinearGradient
                colors={['#1976D2', '#0288D1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>{formType === 'login' ? 'Login' : 'Sign Up'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={handleGoogleSignIn}
              accessibilityLabel="Continue with Google"
            >
              <LinearGradient
                colors={['#FFFFFF', '#F5F5F5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <View style={styles.googleButtonContent}>
                  <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.googleIcon}
                    accessibilityLabel="Google logo"
                  />
                  <Text style={[styles.buttonText, { color: '#333' }]}>Continue with Google</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuest}
              accessibilityLabel="Play as Guest"
            >
              <Text style={styles.guestText}>Play as Guest</Text>
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
    backgroundColor: '#121212',
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
    color: '#E0E0E0',
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
    backgroundColor: '#2A2A2E',
    borderRadius: 25,
    marginBottom: height * 0.03,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333 “…333333',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: height * 0.02,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#0288D1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  toggleText: {
    color: '#999',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#E0E0E0',
  },
  inputsContainer: {
    marginBottom: height * 0.03,
    minHeight: height * 0.1,
  },
  input: {
    width: '100%',
    height: Math.min(height * 0.06, 50),
    backgroundColor: '#1E1E24',
    borderRadius: 8,
    paddingHorizontal: width * 0.04,
    color: '#E0E0E0',
    fontSize: Math.min(width * 0.04, 16),
    marginVertical: height * 0.02,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  errorText: {
    color: '#EF5350',
    fontSize: Math.min(width * 0.035, 14),
    marginTop: height * 0.01,
    textAlign: 'center',
    minHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#E0E0E0',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: '600',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: Math.min(width * 0.05, 18),
    height: Math.min(width * 0.05, 18),
    marginRight: width * 0.02,
  },
  guestButton: {
    marginTop: height * 0.03,
    alignItems: 'center',
  },
  guestText: {
    color: '#0288D1',
    fontSize: Math.min(width * 0.04, 15),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});