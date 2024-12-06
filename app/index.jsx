
import {Text, View,TouchableOpacity, ImageBackground } from "react-native";
import { Link } from "expo-router";
import styles from './css/style.jsx';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';


export default function Index() {
  const navigation = useNavigation();



  return (   
    <View style={styles.MainView}>
           <ImageBackground
    source={require("../assets/images/auth/auth1.png" )}
        style={styles.background}>
      
      <View style={styles.header}>
      <View style={styles.about}>
        <Text style={styles.aboutIcon}>!</Text>
      </View>
      </View>
    
 
      <View style={styles.auth}>

   

      <View style={styles.btnArrange}>
  
    
      <TouchableOpacity style={styles.authBtn}
       onPress={() => navigation.navigate('loginPage')} >
      <LinearGradient
      colors={['#38B6FF', '#2C5AAD']} // Gradient colors
      start={{ x: 0, y: 0 }} // Starting point (left)
      end={{ x: 1, y: 0 }}   // Ending point (right)
      style={styles.button}
    >
        <Text style={styles.buttonText}>LOGIN</Text>
        </LinearGradient>
      </TouchableOpacity>
   

      
      <TouchableOpacity style={styles.authBtn}
       onPress={() => navigation.navigate('signup')} >
      <LinearGradient
      colors={['#38B6FF', '#2C5AAD']} // Gradient colors
      start={{ x: 0, y: 0 }} // Starting point (left)
      end={{ x: 1, y: 0 }}   // Ending point (right)

      style={styles.button}
    >
        <Text style={styles.buttonText}>SIGN UP</Text>
        </LinearGradient>
      </TouchableOpacity>
    
    
      <TouchableOpacity
      style={styles.authBtn}
      onPress={() => navigation.navigate('homePage')}
    >
      <LinearGradient
        colors={['#3E638F', '#192C55']} // Gradient colors
        start={{ x: 0, y: 0 }} // Starting point (left)
        end={{ x: 1, y: 0 }}   // Ending point (right)
        style={styles.button}
      >
        <Text style={styles.buttonText}>PLAY AS GUEST</Text>
      </LinearGradient>
    </TouchableOpacity>
      </View>

      </View>
      
      </ImageBackground>
      </View>
  


  );
}

