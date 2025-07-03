import React, { useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, ImageBackground } from "react-native";
import { useNavigation } from '@react-navigation/native';
const { width, height } = Dimensions.get('window');
import AuthPage from './User.jsx';

export default function ChessMateHome() {
  const [selectedMode, setSelectedMode] = useState("classic"); // State to track the selected mode
  const [selectedOption, setSelectedOption] = useState(null); // State to track the selected option
  const [page,setPage]=useState("home");
  const navigation = useNavigation();
  
  const handleGame = () => {
    navigation.navigate("chess", { mode: selectedMode });
  };

  const handlePage = (name) => {
    setPage(name);
    navigation(page);
    console.log(`Navigating to page: ${name}`); // Log the new page directly
  };
  

  return (
    <View style={{ flex: 1 }}>
 
     
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.settingsIcon}>
            <Image
              source={require("../assets/images/home/setting.png")}
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>

        {/* Middle Section */}
        <View style={styles.middle}>
          <Image
            source={require("../assets/images/home/chessmate.png")}
            style={styles.chessmateImg}
          />
          <Image
            source={require("../assets/images/home/letsplay.png")}
            style={styles.letsplayImg}
          />
        </View>

        {/* Modes */}
        <View style={styles.modesContainer}>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'classic' ? styles.selectedMode : null,
            ]}
            onPress={() => setSelectedMode('classic')}
          >
            <Image
              source={require("../assets/images/home/classic.png")}
              style={styles.modeImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'blitz' ? styles.selectedMode : null,
            ]}
            onPress={() => setSelectedMode('blitz')}
          >
            <Image
              source={require("../assets/images/home/blitz.png")}
              style={styles.modeImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'unlimited' ? styles.selectedMode : null,
            ]}
            onPress={() => setSelectedMode('unlimited')}
          >
            <Image
              source={require("../assets/images/home/unlimited.png")}
              style={styles.modeImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'rush' ? styles.selectedMode : null,
            ]}
            onPress={() => setSelectedMode('rush')}
          >
            <Image
              source={require("../assets/images/home/rush.png")}
              style={styles.modeImage}
            />
          </TouchableOpacity>
        </View>

        {/* Chess Mid Section */}
        <View style={styles.chessmid}>
          <Image
            source={require("../assets/images/home/chessmid.png")}
            style={styles.chessmidImg}
          />
        </View>

        {/* Play Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.option,
              selectedOption === 'playcom' ? styles.selectedOption : null,
            ]}
            onPress={() => {
              navigation.navigate("chessAi", { mode: selectedMode });
            }}
          >
            <Image
              source={require("../assets/images/home/playcom.png")}
              style={styles.optionImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.option,
              selectedOption === 'playmulti' ? styles.selectedOption : null,
            ]}
            onPress={() => {
              navigation.navigate("chess", { mode: selectedMode });
            }}
          >
            <Image
              source={require("../assets/images/home/playmulti.png")}
              style={styles.optionImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.option,
              selectedOption === 'playon' ? styles.selectedOption : null,
            ]}
            onPress={() => {
              alert("Cooming Soon")
            }}
          >
            <Image
              source={require("../assets/images/home/playon.png")}
              style={styles.optionImage}
            />
          </TouchableOpacity>
        </View>
        </ScrollView>
        </View>
    
 )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F', // Deep black background
    paddingHorizontal: 15,
    paddingTop: 30,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 0, // Restored padding to prevent footer overlap
    width: '100%',
    minHeight: height, // Ensure ScrollView takes full height
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 0,
    marginBottom: 15,
  },
  settingsIcon: {
    padding: 12,
    backgroundColor: '#2A2A2A', // Charcoal gray for settings button
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    width: 30,
    height: 30,
    // tintColor: '#EDEDED', // Soft pearl for settings icon
  },
  middle: {
    alignItems: 'center',
    marginBottom: 0,
  },
  chessmateImg: {
    width: "100%",
    height: 40,
    resizeMode: 'contain',
    marginBottom: 2,
  },
  letsplayImg: {
    width: 150,
    height: 45,
    resizeMode: 'contain',
  },
  modesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 0,
  },
  mode: {
    width: width * 0.45,
    alignItems: 'center',
    backgroundColor: '#2A2A2A', // Charcoal gray for mode buttons
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  selectedMode: {
    borderWidth: 2,
    borderColor: '#B76E79', // Rose gold for selected mode
    backgroundColor: '#1C1C1C', // Slightly lighter black
    transform: [{ scale: 1.03 }],
  },
  modeImage: {
    width: '100%',
    height: 80,
    resizeMode: 'contain',
  },
  chessmid: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 5,
  },
  chessmidImg: {
    width: '100%',
    height: 100,
    resizeMode: 'contain',
  },
  optionsContainer: {
    width: '100%',
    marginVertical: 0,
  },
  option: {
    backgroundColor: '#2A2A2A', // Charcoal gray for options
    padding: 15,
    borderRadius: 15,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#DC143C', // Crimson for selected option
    backgroundColor: '#1C1C1C', // Slightly lighter black
  },
  optionImage: {
    width: '80%',
    height: 40,
    resizeMode: 'contain',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#2A2A2A', // Charcoal gray for footer
    paddingVertical: 12,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  footerIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    tintColor: '#EDEDED', // Soft pearl for footer icons
  },
});