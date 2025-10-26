import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView,
  StatusBar,
  Modal,
  BackHandler
} from "react-native";
import { useRouter } from 'expo-router';
import { ClickSoundContext } from './clickSound';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function ChessMateHome() {
  const [selectedMode, setSelectedMode] = useState("classic");
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [showAiLevelModal, setShowAiLevelModal] = useState(false);
  const [selectedAiLevel, setSelectedAiLevel] = useState("medium");
  const router = useRouter();
  const clickSoundContext = React.useContext(ClickSoundContext);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const handleGame = () => {
    router.push({ pathname: '/chess', params: { mode: selectedMode || 'classic' } });
  };

  const handlePlayWithComputer = () => {
    clickSoundContext?.playClick?.();
    setShowAiLevelModal(true);
  };

  const handleAiLevelSelect = (level) => {
    clickSoundContext?.playClick?.();
    setSelectedAiLevel(level);
  };

  const handleStartGame = () => {
    clickSoundContext?.playClick?.();
    setShowAiLevelModal(false);
    router.push({ pathname: '/chessAi', params: { mode: selectedMode || 'classic', level: selectedAiLevel || 'medium' } });
  };

  const handleCloseModal = () => {
    clickSoundContext?.playClick?.();
    setShowAiLevelModal(false);
  };

  // Calculate responsive sizes
  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;
  const availableHeight = screenHeight - 80; // Account for bottom nav
  const isTablet = screenWidth > 768;
  const isSmallScreen = screenHeight < 700;
  const isLargeScreen = screenHeight > 800;
  
  // Responsive font sizes
  const titleFontSize = isTablet ? 32 : isSmallScreen ? 24 : 28;
  const subtitleFontSize = isTablet ? 16 : isSmallScreen ? 12 : 14;
  const modeFontSize = isTablet ? 14 : isSmallScreen ? 10 : 12;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" hidden translucent />
      
      {/* Main content wrapper */}
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={[styles.header, { height: availableHeight * 0.08 }]}>
          <TouchableOpacity
            style={styles.settingsIcon}
            onPress={() =>{clickSoundContext?.playClick?.(), router.push('/setting')}}
          >
            <Ionicons
              name="settings"
              size={isTablet ? 35 : 30}
              color="#FFFFFF"
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
              (selectedMode || 'classic') === 'classic' && styles.selectedMode,
              { 
               width: screenWidth * 0.42,
                height: availableHeight * 0.14,
              }
            ]}
            onPress={() =>{clickSoundContext?.playClick?.(), setSelectedMode('classic')}}
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
              (selectedMode || 'classic') === 'blitz' && styles.selectedMode,
              { 
            width: screenWidth * 0.42,
                height: availableHeight * 0.14,
              }
            ]}
            onPress={() =>{clickSoundContext?.playClick?.(),setSelectedMode('blitz')}}
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
              (selectedMode || 'classic') === 'unlimited' && styles.selectedMode,
              { 
       width: screenWidth * 0.42,
                height: availableHeight * 0.14,
              }
            ]}
            onPress={() =>{clickSoundContext?.playClick?.(), setSelectedMode('unlimited')}}
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
              (selectedMode || 'classic') === 'rush' && styles.selectedMode,
              { 
              width: screenWidth * 0.42,
                height: availableHeight * 0.14,
              }
            ]}
            onPress={() =>{clickSoundContext?.playClick?.(), setSelectedMode('rush')}}
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
              width: screenWidth *0.85,
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
            onPress={handlePlayWithComputer}
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
            onPress={() =>{clickSoundContext?.playClick?.(), router.push({ pathname: '/chess', params: { mode: selectedMode || 'classic' } })}}
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
            onPress={() =>{clickSoundContext?.playClick?.(), router.push('/Friend')}}
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

      {/* AI Level Selection Modal */}
      <Modal
        visible={showAiLevelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { 
            width: Math.min(screenWidth * 0.9, 400),
            maxHeight: screenHeight * 0.85,
            marginHorizontal: 20,
          }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { 
                fontSize: isTablet ? 22 : isSmallScreen ? 16 : 18,
                flex: 1,
                marginRight: 10,
              }]} numberOfLines={2}>
                Select AI Difficulty
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Ionicons name="close" size={isTablet ? 22 : isSmallScreen ? 18 : 20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* AI Level Options */}
            <View style={styles.levelOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.levelOption,
                  (selectedAiLevel || 'medium') === 'easy' && styles.selectedLevelOption,
                  { 
                    minHeight: isSmallScreen ? 60 : 70,
                    paddingVertical: isSmallScreen ? 12 : 15,
                  }
                ]}
                onPress={() => handleAiLevelSelect('easy')}
              >
                <View style={styles.levelOptionContent}>
                  <Ionicons 
                    name="leaf" 
                    size={isTablet ? 26 : isSmallScreen ? 20 : 22} 
                    color={(selectedAiLevel || 'medium') === 'easy' ? '#4ECDC4' : '#AAAAAA'} 
                  />
                  <View style={styles.levelTextContainer}>
                    <Text style={[
                      styles.levelTitle,
                      { 
                        fontSize: isTablet ? 18 : isSmallScreen ? 15 : 16,
                      },
                      (selectedAiLevel || 'medium') === 'easy' && styles.selectedLevelText
                    ]} numberOfLines={1}>
                      Easy
                    </Text>
                    <Text style={[
                      styles.levelDescription,
                      { 
                        fontSize: isTablet ? 14 : isSmallScreen ? 12 : 13,
                      }
                    ]} numberOfLines={2}>
                      Perfect for beginners
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.levelOption,
                  (selectedAiLevel || 'medium') === 'medium' && styles.selectedLevelOption,
                  { 
                    minHeight: isSmallScreen ? 60 : 70,
                    paddingVertical: isSmallScreen ? 12 : 15,
                  }
                ]}
                onPress={() => handleAiLevelSelect('medium')}
              >
                <View style={styles.levelOptionContent}>
                  <Ionicons 
                    name="trending-up" 
                    size={isTablet ? 26 : isSmallScreen ? 20 : 22} 
                    color={(selectedAiLevel || 'medium') === 'medium' ? '#4ECDC4' : '#AAAAAA'} 
                  />
                  <View style={styles.levelTextContainer}>
                    <Text style={[
                      styles.levelTitle,
                      { 
                        fontSize: isTablet ? 18 : isSmallScreen ? 15 : 16,
                      },
                      (selectedAiLevel || 'medium') === 'medium' && styles.selectedLevelText
                    ]} numberOfLines={1}>
                      Medium
                    </Text>
                    <Text style={[
                      styles.levelDescription,
                      { 
                        fontSize: isTablet ? 14 : isSmallScreen ? 12 : 13,
                      }
                    ]} numberOfLines={2}>
                      Balanced challenge
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.levelOption,
                  (selectedAiLevel || 'medium') === 'hard' && styles.selectedLevelOption,
                  { 
                    minHeight: isSmallScreen ? 60 : 70,
                    paddingVertical: isSmallScreen ? 12 : 15,
                  }
                ]}
                onPress={() => handleAiLevelSelect('hard')}
              >
                <View style={styles.levelOptionContent}>
                  <Ionicons 
                    name="flash" 
                    size={isTablet ? 26 : isSmallScreen ? 20 : 22} 
                    color={(selectedAiLevel || 'medium') === 'hard' ? '#4ECDC4' : '#AAAAAA'} 
                  />
                  <View style={styles.levelTextContainer}>
                    <Text style={[
                      styles.levelTitle,
                      { 
                        fontSize: isTablet ? 18 : isSmallScreen ? 15 : 16,
                      },
                      (selectedAiLevel || 'medium') === 'hard' && styles.selectedLevelText
                    ]} numberOfLines={1}>
                      Hard
                    </Text>
                    <Text style={[
                      styles.levelDescription,
                      { 
                        fontSize: isTablet ? 14 : isSmallScreen ? 12 : 13,
                      }
                    ]} numberOfLines={2}>
                      Expert level challenge
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Start Game Button */}
            <TouchableOpacity
              style={[styles.startGameButton, { 
                minHeight: isSmallScreen ? 50 : 60,
                paddingVertical: isSmallScreen ? 12 : 15,
              }]}
              onPress={handleStartGame}
            >
              <Text style={[styles.startGameText, { 
                fontSize: isTablet ? 18 : isSmallScreen ? 15 : 16,
              }]} numberOfLines={1}>
                Start Game
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    backgroundColor: '#0F0F0F',
  },
  contentWrapper: {
    flex: 1,
    paddingBottom:0,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 5,
    borderRadius: 15,
    backgroundColor: '#333333',
  },
  levelOptionsContainer: {
    marginBottom: 20,
  },
  levelOption: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginVertical: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLevelOption: {
    borderColor: '#4ECDC4',
    backgroundColor: '#1C3B39',
  },
  levelOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelTextContainer: {
    marginLeft: 15,
    flex: 1,
    justifyContent: 'center',
  },
  levelTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedLevelText: {
    color: '#4ECDC4',
  },
  levelDescription: {
    color: '#AAAAAA',
    lineHeight: 18,
  },
  startGameButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  startGameText: {
    color: '#000000',
    fontWeight: 'bold',
  },
});