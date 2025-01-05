import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const User = ({ user }) => {
  const backgroundImage = require('../assets/images/home/hbg.png');
  const {
    username,
    profilePicture,
    ranking,
    gamesPlayed,
    gamesWon,
    gamesLost,
  } = user || {};

  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundImage}>
      <View style={styles.container}>
        {user ? (
          <View>
            <View style={styles.profileSection}>
              <Image source={profilePicture} style={styles.profileImage} />
              <Text style={styles.username}>{username}</Text>
            </View>

            <View style={styles.statsSection}>
              <Text style={styles.statText}>ELO: {ranking}</Text>
              <Text style={styles.statText}>Ranking: {ranking}</Text>
              <Text style={styles.statText}>Games Played: {gamesPlayed}</Text>
              <Text style={styles.statText}>Games Won: {gamesWon}</Text>
              <Text style={styles.statText}>Games Lost: {gamesLost}</Text>
            </View>

            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authSection}>
            <Text style={styles.authText}>Please login or create an account!</Text>
            <TouchableOpacity style={styles.authButton}>
              <Text style={styles.authButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.authButton}>
              <Text style={styles.authButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        
           )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    height: height - 100,
    padding: 40,
    justifyContent: 'center',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#483248',
    borderRadius: 50,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    elevation: 2,
  },
  statText: {
    fontSize: 18,
    marginVertical: 5,
  },
  button: {
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authSection: {
    alignItems: 'center',
  },
  authText: {
    fontSize: 18,
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
    width: '60%',
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default User;
