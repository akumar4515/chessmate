import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, Dimensions, ScrollView, BackHandler, SafeAreaView, StatusBar } from 'react-native';
import { Chess } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { ClickSoundContext } from './clickSound';

// Redux imports
import { useAppDispatch, useGameData, useUISettings } from '../src/hooks/reduxHooks';
import {
  initializeGame,
  makeMove,
  undoMove,
  resetGame,
  setSelectedSquare,
  setKingInCheck,
  togglePlayPause,
  updateTimers,
  setPromotionModalVisible,
  setPromotionMove,
  setGameOverModalVisible,
  setExitModalVisible,
  setShowBlackCaptured,
  setShowWhiteCaptured,
  setSelectedColor,
  setShowMoves,
  setBoardFlipped,
} from '../src/store/slices/gameSlice';

const { width, height } = Dimensions.get('window');

// Enhanced responsive calculations
const isTablet = width > 768;
const isSmallScreen = height < 700;
const isLargeScreen = height > 800;
const isVerySmallScreen = height < 600;
const isVeryLargeScreen = height > 900;

// Calculate available height for the board
const statusBarHeight = 0;
const headerHeight = 70;
const playerSectionHeight = 120;
const controlPanelHeight = 60;
const bottomPadding = 20;
const availableHeight = height - statusBarHeight - headerHeight - playerSectionHeight - controlPanelHeight - bottomPadding;

// Calculate optimal square size based on available space
const maxBoardWidth = width - 40;
const maxBoardHeight = availableHeight - 20;
const maxSquareSize = Math.min(maxBoardWidth / 8, maxBoardHeight / 8);
const squareSize = Math.max(30, Math.min(maxSquareSize, 60));

// Responsive font sizes
const getResponsiveFontSize = (baseSize) => {
  if (isVerySmallScreen) return baseSize * 0.8;
  if (isSmallScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize * 1.1;
  if (isVeryLargeScreen) return baseSize * 1.2;
  return baseSize;
};

// Responsive spacing
const getResponsiveSpacing = (baseSpacing) => {
  if (isVerySmallScreen) return baseSpacing * 0.7;
  if (isSmallScreen) return baseSpacing * 0.8;
  if (isLargeScreen) return baseSpacing * 1.2;
  if (isVeryLargeScreen) return baseSpacing * 1.3;
  return baseSpacing;
};

// Piece images for the board and captured pieces
const pieceImages = {
  'r': require('../assets/images/pieces/black-rook.png'),
  'n': require('../assets/images/pieces/black-knight.png'),
  'b': require('../assets/images/pieces/black-bishop.png'),
  'q': require('../assets/images/pieces/black-queen.png'),
  'k': require('../assets/images/pieces/black-king.png'),
  'p': require('../assets/images/pieces/black-pawn.png'),
  'R': require('../assets/images/pieces/white-rook.png'),
  'N': require('../assets/images/pieces/white-knight.png'),
  'B': require('../assets/images/pieces/white-bishop.png'),
  'Q': require('../assets/images/pieces/white-queen.png'),
  'K': require('../assets/images/pieces/white-king.png'),
  'P': require('../assets/images/pieces/white-pawn.png'),
};

export default function ChessReduxApp() {
  // Redux state and dispatch
  const dispatch = useAppDispatch();
  const gameData = useGameData();
  const uiSettings = useUISettings();
  
  // Local state for sounds and other non-Redux state
  const [moveSound, setMoveSound] = React.useState(null);
  const [captureSound, setCaptureSound] = React.useState(null);
  const [castleSound, setCastleSound] = React.useState(null);
  const [promoteSound, setPromoteSound] = React.useState(null);
  const [checkSound, setCheckSound] = React.useState(null);
  
  const clickSoundContext = React.useContext(ClickSoundContext);
  const router = useRouter();
  const { mode } = useLocalSearchParams();
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Initialize game on component mount
  useEffect(() => {
    dispatch(initializeGame(mode || 'classic'));
  }, [dispatch, mode]);

  // Load and unload sound effects
  useEffect(() => {
    loadSounds();
    return () => unloadSounds();
  }, []);

  const loadSounds = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
      });

      console.log('🔊 Loading chess sounds...');
      const soundPromises = [
        Audio.Sound.createAsync(require('../assets/sounds/move.mp3'), { volume: 0.7 }),
        Audio.Sound.createAsync(require('../assets/sounds/capture.mp3'), { volume: 0.8 }),
        Audio.Sound.createAsync(require('../assets/sounds/castle.mp3'), { volume: 0.7 }),
        Audio.Sound.createAsync(require('../assets/sounds/promote.mp3'), { volume: 0.8 }),
        Audio.Sound.createAsync(require('../assets/sounds/move-check.mp3'), { volume: 0.9 }),
      ];

      const results = await Promise.allSettled(soundPromises);
      const [move, capture, castle, promote, check] = results.map(result =>
        result.status === 'fulfilled' ? result.value.sound : null
      );

      setMoveSound(move);
      setCaptureSound(capture);
      setCastleSound(castle);
      setPromoteSound(promote);
      setCheckSound(check);
      console.log('🔊 Chess sounds loaded successfully');
    } catch (error) {
      console.warn('🔊 Error loading chess sounds:', error);
    }
  };

  const unloadSounds = async () => {
    await Promise.all([
      moveSound?.unloadAsync(),
      captureSound?.unloadAsync(),
      castleSound?.unloadAsync(),
      promoteSound?.unloadAsync(),
      checkSound?.unloadAsync(),
    ]);
  };

  const playSound = async (sound) => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.setPositionAsync(0);
          await sound.playAsync();
        }
      } catch (error) {
        console.warn('🔊 Error playing sound:', error);
      }
    }
  };

  // Timer logic
  useEffect(() => {
    if (gameData.isPlay && !gameData.isGameOver && isMountedRef.current) {
      timerRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return;
        }
        
        if (gameData.currentTurn === 'w') {
          const newWhiteTimer = gameData.whiteTimer - 1;
          if (newWhiteTimer <= 0) {
            clearInterval(timerRef.current);
            if (isMountedRef.current) {
              dispatch(setGameOverModalVisible(true));
            }
            dispatch(updateTimers({ whiteTimer: 0, blackTimer: gameData.blackTimer }));
          } else {
            dispatch(updateTimers({ whiteTimer: newWhiteTimer, blackTimer: gameData.blackTimer }));
          }
        } else {
          const newBlackTimer = gameData.blackTimer - 1;
          if (newBlackTimer <= 0) {
            clearInterval(timerRef.current);
            if (isMountedRef.current) {
              dispatch(setGameOverModalVisible(true));
            }
            dispatch(updateTimers({ whiteTimer: gameData.whiteTimer, blackTimer: 0 }));
          } else {
            dispatch(updateTimers({ whiteTimer: gameData.whiteTimer, blackTimer: newBlackTimer }));
          }
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameData.currentTurn, gameData.isGameOver, gameData.isPlay, dispatch, gameData.whiteTimer, gameData.blackTimer]);

  // Check detection
  useEffect(() => {
    const chess = new Chess(gameData.gameFEN);
    if (chess.inCheck()) {
      const kingPosition = findKingPosition(chess);
      dispatch(setKingInCheck(kingPosition));
      playSound(checkSound);
    } else {
      dispatch(setKingInCheck(null));
    }
  }, [gameData.gameFEN, checkSound, dispatch]);

  const findKingPosition = (chess) => {
    const board = chess.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const square = board[row][col];
        if (square?.type === 'k' && square.color === chess.turn()) {
          return `${String.fromCharCode(97 + col)}${8 - row}`;
        }
      }
    }
  };

  // Handle square press for moves
  const onSquarePress = (rowIndex, colIndex) => {
    const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
    const chess = new Chess(gameData.gameFEN);
    const piece = chess.get(square);

    if (gameData.selectedSquare) {
      if (square === gameData.selectedSquare) {
        dispatch(setSelectedSquare(null));
        return;
      }

      const move = chess.moves({ square: gameData.selectedSquare, verbose: true }).find(m => m.to === square);
      if (move) {
        if (move.flags.includes('p')) {
          // Handle pawn promotion
          dispatch(setPromotionMove({ from: gameData.selectedSquare, to: square }));
          dispatch(setPromotionModalVisible(true));
        } else {
          // Make the move
          dispatch(makeMove({ from: gameData.selectedSquare, to: square, promotion: 'q' }));
        }
        dispatch(setSelectedSquare(null));
      } else if (piece?.color === chess.turn()) {
        dispatch(setSelectedSquare(square));
      }
    } else if (piece?.color === chess.turn()) {
      dispatch(setSelectedSquare(square));
    }
  };

  // Handle pawn promotion
  const handlePromotion = (piece) => {
    dispatch(makeMove({ from: gameData.promotionMove.from, to: gameData.promotionMove.to, promotion: piece }));
    dispatch(setPromotionMove(null));
    dispatch(setPromotionModalVisible(false));
  };

  // UI handlers
  const handlePauseResume = () => {
    dispatch(togglePlayPause());
  };

  const handleExit = () => {
    dispatch(setExitModalVisible(true));
  };

  const handleConfirmExit = () => {
    isMountedRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    dispatch(resetGame(mode || 'classic'));
    router.push('/');
    dispatch(setExitModalVisible(false));
    dispatch(setGameOverModalVisible(false));
  };

  const handleCancelExit = () => {
    dispatch(setExitModalVisible(false));
  };

  const handleRematch = () => {
    dispatch(resetGame(mode || 'classic'));
    dispatch(setGameOverModalVisible(false));
  };

  const toggleSidebar = () => {
    // This would be handled by UI slice
    console.log('Toggle sidebar');
  };

  const toggleShowMoves = () => {
    dispatch(setShowMoves(!uiSettings.gameUI.showMoves));
  };

  const toggleBoardOrientation = () => {
    dispatch(setBoardFlipped(!uiSettings.gameUI.isBoardFlipped));
  };

  const handleColorChange = (light, dark) => {
    dispatch(setSelectedColor({ light, dark }));
  };

  // Back handler
  useEffect(() => {
    const backAction = () => {
      if (!gameData.exitModalVisible && !gameData.isGameOver) {
        dispatch(setExitModalVisible(true));
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [gameData.exitModalVisible, gameData.isGameOver, dispatch]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const chess = new Chess(gameData.gameFEN);
  const board = chess.board();
  const renderBoard = uiSettings.gameUI.isBoardFlipped ? board.slice().reverse() : board;

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    if ((mode || 'classic') === 'unlimited') return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" hidden translucent />
      
      {/* Header */}
      <View style={[styles.headerContainer, { height: getResponsiveSpacing(70) }]}>
        <TouchableOpacity onPress={() => { clickSoundContext?.playClick?.(), handleExit() }} style={[styles.headerButton, { width: getResponsiveSpacing(40), height: getResponsiveSpacing(40) }]}>
          <Ionicons name="arrow-back" size={getResponsiveFontSize(24)} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.gameMode, { fontSize: getResponsiveFontSize(18) }]}>{(mode || 'classic').toUpperCase()}</Text>
          <Text style={[styles.gameModeSubtext, { fontSize: getResponsiveFontSize(12) }]}>Redux Game</Text>
        </View>

        <TouchableOpacity onPress={() => { clickSoundContext?.playClick?.(), toggleSidebar() }} style={[styles.headerButton, { width: getResponsiveSpacing(40), height: getResponsiveSpacing(40) }]}>
          <Ionicons name="settings" size={getResponsiveFontSize(24)} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Player Section - Black */}
      <View style={[styles.playerSection, { paddingVertical: getResponsiveSpacing(8) }]}>
        <TouchableOpacity 
          style={[styles.playerCard, gameData.currentTurn === 'b' && styles.activePlayerCard, { padding: getResponsiveSpacing(12) }]}
          onPress={() => { clickSoundContext?.playClick?.(), dispatch(setShowBlackCaptured(!gameData.showBlackCaptured)) }}
        >
          <View style={styles.playerInfo}>
            <View style={[styles.playerAvatar, { width: getResponsiveSpacing(36), height: getResponsiveSpacing(36) }]}>
              <Ionicons name="person" size={getResponsiveFontSize(20)} color="#FFFFFF" />
            </View>
            <View style={styles.playerDetails}>
              <Text style={[styles.playerName, { fontSize: getResponsiveFontSize(16) }]}>Black</Text>
              <Text style={[styles.statusText, { fontSize: getResponsiveFontSize(12) }]}>
                {gameData.currentTurn === 'b' ? 'Playing' : 'Waiting'}
              </Text>
            </View>
          </View>
          {(mode || 'classic') !== 'unlimited' && (
            <View style={[styles.timerContainer, { paddingHorizontal: getResponsiveSpacing(12), paddingVertical: getResponsiveSpacing(6) }]}>
              <Text style={[styles.timerText, gameData.blackTimer <= 10 ? styles.urgentTimer : null, { fontSize: getResponsiveFontSize(14) }]}>
                {formatTime(gameData.blackTimer || 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Chess Board */}
      <View style={[styles.boardSection, { flex: 1, minHeight: squareSize * 8 + 20 }]}>
        <View style={[styles.chessboardContainer, { 
          width: squareSize * 8 + 12, 
          height: squareSize * 8 + 12,
          padding: 6 
        }]}>
          {renderBoard.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((square, colIndex) => {
                const adjustedRow = uiSettings.gameUI.isBoardFlipped ? 7 - rowIndex : rowIndex;
                const adjustedCol = uiSettings.gameUI.isBoardFlipped ? 7 - colIndex : colIndex;
                const squareName = `${String.fromCharCode(97 + adjustedCol)}${8 - adjustedRow}`;
                const isSelected = gameData.selectedSquare === squareName;
                const isValidMove = gameData.validMoves.includes(squareName);
                const isKingInCheck = gameData.kingInCheck === squareName;

                return (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    style={[
                      styles.square,
                      {
                        width: squareSize,
                        height: squareSize,
                        backgroundColor: (adjustedRow + adjustedCol) % 2 === 0 
                          ? uiSettings.gameUI.boardColors.light 
                          : uiSettings.gameUI.boardColors.dark
                      },
                      isSelected && styles.selectedSquare,
                      isValidMove && styles.validMoveSquare,
                      isKingInCheck && styles.kingInCheckSquare,
                    ]}
                    onPress={() => onSquarePress(adjustedRow, adjustedCol)}
                  >
                    {uiSettings.gameUI.showMoves && isValidMove && !square && (
                      <View style={[styles.validMoveDot, { 
                        width: Math.max(6, squareSize * 0.2), 
                        height: Math.max(6, squareSize * 0.2),
                        borderRadius: Math.max(3, squareSize * 0.1)
                      }]} />
                    )}
                    {square && (
                      <Image 
                        source={pieceImages[square.color === 'w' ? square.type.toUpperCase() : square.type]} 
                        style={[styles.pieceImage, { 
                          width: squareSize * 0.9, 
                          height: squareSize * 0.9 
                        }]} 
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Player Section - White */}
      <View style={[styles.playerSection, { paddingVertical: getResponsiveSpacing(8) }]}>
        <TouchableOpacity 
          style={[styles.playerCard, gameData.currentTurn === 'w' && styles.activePlayerCard, { padding: getResponsiveSpacing(12) }]}
          onPress={() => { clickSoundContext?.playClick?.(), dispatch(setShowWhiteCaptured(!gameData.showWhiteCaptured)) }}
        >
          <View style={styles.playerInfo}>
            <View style={[styles.playerAvatar, { width: getResponsiveSpacing(36), height: getResponsiveSpacing(36) }]}>
              <Ionicons name="person" size={getResponsiveFontSize(20)} color="#FFFFFF" />
            </View>
            <View style={styles.playerDetails}>
              <Text style={[styles.playerName, { fontSize: getResponsiveFontSize(16) }]}>White</Text>
              <Text style={[styles.statusText, { fontSize: getResponsiveFontSize(12) }]}>
                {gameData.currentTurn === 'w' ? 'Playing' : 'Waiting'}
              </Text>
            </View>
          </View>
          {(mode || 'classic') !== 'unlimited' && (
            <View style={[styles.timerContainer, { paddingHorizontal: getResponsiveSpacing(12), paddingVertical: getResponsiveSpacing(6) }]}>
              <Text style={[styles.timerText, gameData.whiteTimer <= 10 ? styles.urgentTimer : null, { fontSize: getResponsiveFontSize(14) }]}>
                {formatTime(gameData.whiteTimer || 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Control Panel */}
      <View style={[styles.controlPanel, { paddingVertical: getResponsiveSpacing(10) }]}>
        <TouchableOpacity style={[styles.undoButton, { paddingHorizontal: getResponsiveSpacing(16), paddingVertical: getResponsiveSpacing(10) }]} onPress={() => { clickSoundContext?.playClick?.(), dispatch(undoMove()) }}>
          <Ionicons name="arrow-undo" size={getResponsiveFontSize(18)} color="#FFFFFF" />
          <Text style={[styles.undoButtonText, { fontSize: getResponsiveFontSize(14) }]}>Undo</Text>
        </TouchableOpacity>
      </View>

      {/* Promotion Modal */}
      <Modal
        visible={gameData.promotionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { clickSoundContext?.playClick?.(), dispatch(setPromotionModalVisible(false)) }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Promotion</Text>
            <View style={styles.promotionOptions}>
              {['q', 'r', 'b', 'n'].map(piece => (
                <TouchableOpacity
                  key={piece}
                  onPress={() => { clickSoundContext?.playClick?.(), handlePromotion(piece) }}
                  style={styles.promotionOption}
                >
                  <Image source={pieceImages[piece]} style={styles.promotionPiece} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Game Over Modal */}
      <Modal
        visible={gameData.isGameOver}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="trophy" size={40} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Game Over</Text>
            <Text style={styles.gameOverMessage}>{gameData.gameOverMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => { clickSoundContext?.playClick?.(), handleRematch() }}>
                <Text style={styles.modalButtonText}>Rematch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={() => { clickSoundContext?.playClick?.(), handleConfirmExit() }}>
                <Text style={styles.modalButtonText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exit Modal */}
      <Modal
        visible={gameData.exitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { clickSoundContext?.playClick?.(), dispatch(setExitModalVisible(false)) }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={40} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Leave Game?</Text>
            <Text style={styles.exitMessage}>Do you want to leave?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => { clickSoundContext?.playClick?.(), handleConfirmExit() }}>
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={() => { clickSoundContext?.playClick?.(), handleCancelExit() }}>
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles (same as original chess.jsx)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    backgroundColor: '#0F0F0F',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  headerCenter: {
    alignItems: 'center',
  },
  gameMode: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameModeSubtext: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 2,
  },
  playerSection: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  activePlayerCard: {
    borderColor: '#555555',
    backgroundColor: '#222222',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 2,
  },
  timerContainer: {
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 45,
    textAlign: 'center',
  },
  urgentTimer: {
    color: '#FF4444',
  },
  boardSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  chessboardContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  selectedSquare: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  validMoveSquare: {
    borderWidth: 2,
    borderColor: '#AAAAAA',
  },
  validMoveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#AAAAAA',
    position: 'absolute',
    zIndex: 1,
  },
  kingInCheckSquare: {
    backgroundColor: '#AA0000',
  },
  pieceImage: {
    resizeMode: 'contain',
    zIndex: 2,
  },
  controlPanel: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#555555',
  },
  undoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
    textAlign: 'center',
  },
  promotionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  promotionOption: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
  },
  promotionPiece: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  gameOverMessage: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  exitMessage: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  modalButton: {
    backgroundColor: '#333333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
