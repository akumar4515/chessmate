import React, { useState } from 'react';
import { ImageBackground, View, Text, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import styles from './css/signupStyle.jsx';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import axios from 'axios';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigation = useNavigation();
  const [isLogin,setIsLogin]=useState(false);

  const handleSignup = async () => {
    try {
      if (!email || !password) {
        Alert.alert('Error', 'Please fill all the fields');
      } else {
        const response = await axios.post('http://192.168.15.61:5000/login', {
  
          email: email,
          password: password,  // Changed to lowercase 'password' to keep it consistent
        });
        if (response.status === 200) {
          setMessage(response.data.message);
          setIsLogin(true);
          navigation.navigate('homePage');
        } else if(response.status===401) {
          setMessage(response.data.message);
        }
        else if(400){
          setMessage(response.data.message);

        }
      }
    } catch (err) {
      console.log(err);
      setMessage(response.data.message);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/images/auth/bg.png")}
        style={styles.background}

      >
          <Image
            source={require("../assets/images/auth/logo.png")}
            style={styles.icon}
          />
        <View style={styles.authPage}>
          

          <View style={styles.inputGroup}>
          <Text style={styles.label}> <FontAwesome name="envelope" size={24} color="white"  /><Text style={styles.labelText}> Email</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
          <Text style={styles.label}><FontAwesome name="lock" size={24} color="white" /><Text style={styles.labelText}> Password</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Text style={styles.terms}>
            By signing up, you agree to our{' '}
            <Text style={styles.link}>Terms & Conditions</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>.
          </Text>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <Text style={styles.signinText}>
            dont have an Account?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('signup')}>Sign Up</Text>
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}
