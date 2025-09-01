import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView,
  StatusBar 
} from "react-native";
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function ChessMateHome() {
  const [selectedMode, setSelectedMode] = useState("classic");
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const navigation = useNavigation();

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const handleGame = () => {
    navigation.navigate("chess", { mode: selectedMode });
  };

  // Calculate responsive sizes
  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;
  const availableHeight = screenHeight - 80; // Account for bottom nav
  const isTablet = screenWidth > 768;
  const isSmallScreen = screenHeight < 700;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      
      {/* Main content wrapper */}
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={[styles.header, { height: availableHeight * 0.08 }]}>
          <TouchableOpacity
            style={styles.settingsIcon}
            onPress={() => navigation.navigate('userDetail')}
          >
            <Image
              source={require('../assets/images/home/setting.png')}
              style={[styles.icon, { 
                width: isTablet ? 35 : 30,
                height: isTablet ? 35 : 30 
              }]}
            />
          </TouchableOpacity>
        </View>

        {/* Middle Section */}
        <View style={[styles.middle, { height: availableHeight * 0.15 }]}>
          <Image
            source={require('../assets/images/home/chessmate.png')}
            style={[styles.chessmateImg, {
              width: screenWidth * 0.9,
              height: availableHeight * 0.08,
            }]}
          />
          <Image
            source={require('../assets/images/home/letsplay.png')}
            style={[styles.letsplayImg, {
              width: Math.min(screenWidth * 0.4, 150),
              height: availableHeight * 0.06,
            }]}
          />
        </View>

        {/* Modes Section */}
        <View style={[styles.modesContainer, { 
          height: availableHeight * 0.35,
          paddingHorizontal: screenWidth * 0.05,
        }]}>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'classic' && styles.selectedMode,
              { 
               width: screenWidth * 0.42,
                height: availableHeight * 0.14,
              }
            ]}
            onPress={() => setSelectedMode('classic')}
          >
            <Image
              source={require('../assets/images/home/classic.png')}
              style={[styles.modeImage, {
                height: availableHeight * 0.14,
              }]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'blitz' && styles.selectedMode,
              { 
            width: screenWidth * 0.42,
                height: availableHeight * 0.14,
              }
            ]}
            onPress={() => setSelectedMode('blitz')}
          >
            <Image
              source={require('../assets/images/home/blitz.png')}
              style={[styles.modeImage, {
                height: availableHeight * 0.14,
              }]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'unlimited' && styles.selectedMode,
              { 
       width: screenWidth * 0.42,
                height: availableHeight * 0.14,
              }
            ]}
            onPress={() => setSelectedMode('unlimited')}
          >
            <Image
              source={require('../assets/images/home/unlimited.png')}
              style={[styles.modeImage, {
                height: availableHeight * 0.14,
              }]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'rush' && styles.selectedMode,
              { 
              width: screenWidth * 0.42,
                height: availableHeight * 0.14,
              }
            ]}
            onPress={() => setSelectedMode('rush')}
          >
            <Image
              source={require('../assets/images/home/rush.png')}
              style={[styles.modeImage, {
                height: availableHeight * 0.14,
              }]}
            />
          </TouchableOpacity>
        </View>

        {/* Chess Mid Section */}
        <View style={[styles.chessmid, { height: availableHeight * 0.10 }]}>
          <Image
            source={require('../assets/images/home/chessmid.png')}
            style={[styles.chessmidImg, {
              width: screenWidth * 0.9,
              height: availableHeight * 0.10,
            }]}
          />
        </View>

        {/* Play Options */}
        <View style={[styles.optionsContainer, {
          height: availableHeight * 0.27,
          paddingHorizontal: screenWidth * 0.05,
        }]}>
          <TouchableOpacity
            style={[styles.option, { height: availableHeight * 0.08 }]}
            onPress={() => navigation.navigate("chessAi", { mode: selectedMode })}
          >
            <Image
              source={require('../assets/images/home/playcom.png')}
              style={[styles.optionImage, {
                height: availableHeight * 0.05,
              }]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { height: availableHeight * 0.08 }]}
            onPress={() => navigation.navigate("chess", { mode: selectedMode })}
          >
            <Image
              source={require('../assets/images/home/playmulti.png')}
              style={[styles.optionImage, {
                height: availableHeight * 0.05,
              }]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { height: availableHeight * 0.08 }]}
            onPress={() => navigation.navigate("Friend")}
          >
            <Image
              source={require('../assets/images/home/playon.png')}
              style={[styles.optionImage, {
                height: availableHeight * 0.05,
              }]}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:35,
    backgroundColor: '#0F0F0F',
  },
  contentWrapper: {
    flex: 1,
    paddingBottom:35,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 15,
  },
  settingsIcon: {
    padding: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    resizeMode: 'contain',
  },
  middle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chessmateImg: {
    resizeMode: 'contain',
    marginBottom: 3,
  },
  letsplayImg: {
    resizeMode: 'contain',
  },
  modesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  mode: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  selectedMode: {
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.6)',
    backgroundColor: '#1C1C1C',
    transform: [{ scale: 1.02 }],
  },
  modeImage: {
    width: '100%',
    resizeMode: 'contain',
  },
  chessmid: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chessmidImg: {
    resizeMode: 'contain',
  },
  optionsContainer: {
    width: '100%',
    justifyContent: 'space-between',
  },
  option: {
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  optionImage: {
    width: '80%',
    resizeMode: 'contain',
  },
});