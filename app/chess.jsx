import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, Dimensions, ScrollView, BackHandler, SafeAreaView, StatusBar } from 'react-native';
import { Chess } from 'chess.js';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { playClick } from './utils/ClickSound';

const { width, height } = Dimensions.get('window');
const squareSize = Math.min(width * 0.113, 45);

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

const greenDotImage = require('../assets/images/green-dot.png');

export default function ChessApp() {
  const [chess] = useState(new Chess());
  const [gameFEN, setGameFEN] = useState(chess.fen());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionModalVisible, setPromotionModalVisible] = useState(false);
  const [promotionMove, setPromotionMove] = useState(null);
  const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [whiteTimer, setWhiteTimer] = useState(0);
  const [blackTimer, setBlackTimer] = useState(0);
  const [currentTurn, setCurrentTurn] = useState('w');
  const [kingInCheck, setKingInCheck] = useState(null);
  const [isPlay, setIsPlay] = useState(true);
  const [pauseName, setPauseName] = useState("Pause");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [moveSound, setMoveSound] = useState(null);
  const [captureSound, setCaptureSound] = useState(null);
  const [castleSound, setCastleSound] = useState(null);
  const [promoteSound, setPromoteSound] = useState(null);
  const [checkSound, setCheckSound] = useState(null);
  const [selectedColor, setSelectedColor] = useState({ light: '#EDEDED', dark: '#8B5A5A' });
  const [showMoves, setShowMoves] = useState(true);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [exitModalVisible, setExitModalVisible] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const { mode } = route.params;

  const board = chess.board();
  const validMoves = selectedSquare ? chess.moves({ square: selectedSquare, verbose: true }).map(move => move.to) : [];

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

  // Set initial timers based on game mode
  useEffect(() => {
    let initialTime;
    switch (mode) {
      case 'classic': initialTime = 60; break;
      case 'blitz': initialTime = 30; break;
      case 'unlimited': initialTime = 999999; break;
      case 'rush': initialTime = 20; break;
      default: initialTime = 60;
    }
    setWhiteTimer(initialTime);
    setBlackTimer(initialTime);
  }, [mode]);

  // Timer logic
  useEffect(() => {
    let timer;
    if (isPlay && !gameOverModalVisible) {
      timer = setInterval(() => {
        if (currentTurn === 'w') {
          setWhiteTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setGameOverMessage('Black wins! White ran out of time.');
              setGameOverModalVisible(true);
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setGameOverMessage('White wins! Black ran out of time.');
              setGameOverModalVisible(true);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentTurn, gameOverModalVisible, isPlay]);

  // Check detection
  useEffect(() => {
    if (chess.inCheck()) {
      const kingPosition = findKingPosition();
      setKingInCheck(kingPosition);
      playSound(checkSound);
    } else {
      setKingInCheck(null);
    }
  }, [gameFEN]);

  const findKingPosition = () => {
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
    const piece = chess.get(square);

    if (selectedSquare) {
      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const move = chess.moves({ square: selectedSquare, verbose: true }).find(m => m.to === square);
      if (move) {
        const moveResult = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (moveResult) {
          if (moveResult.captured) {
            const newCapturedPieces = { ...capturedPieces };
            newCapturedPieces[moveResult.color === 'w' ? 'black' : 'white'].push(moveResult.captured);
            setCapturedPieces(newCapturedPieces);
            playSound(captureSound);
          } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
            playSound(castleSound);
          } else if (moveResult.flags.includes('e')) {
            const newCapturedPieces = { ...capturedPieces };
            newCapturedPieces[moveResult.color === 'w' ? 'black' : 'white'].push('p');
            setCapturedPieces(newCapturedPieces);
            playSound(captureSound);
          } else {
            playSound(moveSound);
          }

          if (moveResult.flags.includes('p')) {
            chess.undo();
            setPromotionMove({ from: selectedSquare, to: square });
            setPromotionModalVisible(true);
          } else {
            setGameFEN(chess.fen());
            setCurrentTurn(chess.turn());
            updateTimersAfterMove();
            updateMoveHistory();
            checkGameOver();
          }
          setSelectedSquare(null);
        }
      } else if (piece?.color === chess.turn()) {
        setSelectedSquare(square);
      }
    } else if (piece?.color === chess.turn()) {
      setSelectedSquare(square);
    }
  };

  // Handle pawn promotion
  const handlePromotion = (piece) => {
    if (promotionMove) {
      const move = chess.move({ from: promotionMove.from, to: promotionMove.to, promotion: piece });
      if (move.captured) {
        const newCapturedPieces = { ...capturedPieces };
        newCapturedPieces[move.color === 'w' ? 'black' : 'white'].push(move.captured);
        setCapturedPieces(newCapturedPieces);
        playSound(captureSound);
      } else {
        playSound(promoteSound);
      }

      setGameFEN(chess.fen());
      setCurrentTurn(chess.turn());
      updateTimersAfterMove();
      updateMoveHistory();
      setPromotionMove(null);
      setPromotionModalVisible(false);
      checkGameOver();
    }
  };

  // Undo last move
  const handleUndo = () => {
    const undoneMove = chess.undo();
    if (undoneMove) {
      setGameFEN(chess.fen());
      setSelectedSquare(null);
      setCurrentTurn(chess.turn());
      if (undoneMove.captured) {
        const capturedBy = undoneMove.color;
        const capturedPiecesCopy = { ...capturedPieces };
        const capturedArray = capturedPiecesCopy[capturedBy === 'w' ? 'black' : 'white'];
        const index = capturedArray.lastIndexOf(undoneMove.captured);
        if (index !== -1) {
          capturedArray.splice(index, 1);
        }
        setCapturedPieces(capturedPiecesCopy);
      }
      setGameOverModalVisible(false);
      updateMoveHistory();
    }
  };

  // Game state management
  const resetGame = () => {
    chess.reset();
    setGameFEN(chess.fen());
    setSelectedSquare(null);
    setCapturedPieces({ white: [], black: [] });
    resetTimersToInitial();
    setCurrentTurn('w');
    setKingInCheck(null);
    setPauseName("Pause");
    setMoveHistory([]);
  };

  const resetTimersToInitial = () => {
    let initialTime;
    switch (mode) {
      case 'classic': initialTime = 60; break;
      case 'blitz': initialTime = 30; break;
      case 'unlimited': initialTime = 999999; break;
      case 'rush': initialTime = 20; break;
      default: initialTime = 60;
    }
    setWhiteTimer(initialTime);
    setBlackTimer(initialTime);
  };

  const updateTimersAfterMove = () => {
    if (mode === 'classic') {
      setWhiteTimer(60);
      setBlackTimer(60);
    } else if (mode === 'rush') {
      setWhiteTimer(20);
      setBlackTimer(20);
    } else if (mode === 'blitz') {
      if (currentTurn === 'w') {
        setBlackTimer(prev => Math.min(prev + 2, 30));
      } else {
        setWhiteTimer(prev => Math.min(prev + 2, 30));
      }
    }
  };

  const checkGameOver = () => {
    if (chess.isCheckmate()) {
      setGameOverMessage(`${chess.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`);
      setGameOverModalVisible(true);
    } else if (chess.isStalemate()) {
      setGameOverMessage('Draw by stalemate!');
      setGameOverModalVisible(true);
    } else if (chess.isInsufficientMaterial()) {
      setGameOverMessage('Draw by insufficient material!');
      setGameOverModalVisible(true);
    } else if (chess.isThreefoldRepetition()) {
      setGameOverMessage('Draw by threefold repetition!');
      setGameOverModalVisible(true);
    } else if (chess.isDraw()) {
      setGameOverMessage('Draw by fifty-move rule!');
      setGameOverModalVisible(true);
    }
  };

  const updateMoveHistory = () => {
    setMoveHistory(chess.history({ verbose: true }));
  };

  // UI handlers
  const handlePauseResume = () => {
    setIsPlay(!isPlay);
    setPauseName(isPlay ? "Resume" : "Pause");
  };

  const handleExit = () => {
    setExitModalVisible(true);
  };

  const handleConfirmExit = () => {
    resetGame();
    navigation.navigate('index');
    setExitModalVisible(false);
    setGameOverModalVisible(false);
  };

  const handleCancelExit = () => {
    setExitModalVisible(false);
  };

  useEffect(() => {
    const backAction = () => {
      if (!gameOverModalVisible && !promotionModalVisible) {
        setExitModalVisible(true);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [gameOverModalVisible, promotionModalVisible]);

  const handleRematch = () => {
    resetGame();
    setPauseName("Pause");
    setGameOverModalVisible(false);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleShowMoves = () => setShowMoves(prev => !prev);
  const toggleBoardOrientation = () => setIsBoardFlipped(!isBoardFlipped);
  const handleColorChange = (light, dark) => setSelectedColor({ light, dark });

  const renderBoard = isBoardFlipped ? board.slice().reverse() : board;

  const formatTime = (seconds) => {
    if (mode === 'unlimited') return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Minimalistic Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={()=>{playClick(),handleExit()}} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.gameMode}>{mode.toUpperCase()}</Text>
          <Text style={styles.gameModeSubtext}>Local Game</Text>
        </View>

        <TouchableOpacity onPress={()=>{playClick(),toggleSidebar()}} style={styles.headerButton}>
          <Ionicons name="settings" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Player Section - Black */}
      <View style={styles.playerSection}>
        <View style={[styles.playerCard, currentTurn === 'b' && styles.activePlayerCard]}>
          <View style={styles.playerInfo}>
            <View style={styles.playerAvatar}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>Black</Text>
              <Text style={styles.statusText}>
                {currentTurn === 'b' ? 'Playing' : 'Waiting'}
              </Text>
            </View>
          </View>
          {mode !== 'unlimited' && (
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, blackTimer <= 10 ? styles.urgentTimer : null]}>
                {formatTime(blackTimer)}
              </Text>
            </View>
          )}
        </View>

        {/* Captured Pieces - Top */}
        {/* <View style={styles.capturedSection}>
          <Text style={styles.capturedLabel}>Captured by Black</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.capturedScrollView}
            contentContainerStyle={styles.capturedScrollContent}
          >
            {capturedPieces.white.map((piece, index) => (
              <Image
                key={index}
                source={pieceImages[piece]}
                style={styles.capturedPieceImage}
              />
            ))}
            {capturedPieces.white.length === 0 && (
              <Text style={styles.noCapturedText}>None</Text>
            )}
          </ScrollView>
        </View> */}
      </View>

      {/* Chess Board */}
      <View style={styles.boardSection}>
        <View style={styles.chessboardContainer}>
          {renderBoard.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((square, colIndex) => {
                const adjustedRow = isBoardFlipped ? 7 - rowIndex : rowIndex;
                const adjustedCol = isBoardFlipped ? 7 - colIndex : colIndex;
                const squareName = `${String.fromCharCode(97 + adjustedCol)}${8 - adjustedRow}`;
                const isSelected = selectedSquare === squareName;
                const isValidMove = validMoves.includes(squareName);
                const isKingInCheck = kingInCheck === squareName;

                return (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    style={[
                      styles.square,
                      {
                        backgroundColor: (adjustedRow + adjustedCol) % 2 === 0 
                          ? selectedColor.light 
                          : selectedColor.dark
                      },
                      isSelected && styles.selectedSquare,
                      isValidMove && styles.validMoveSquare,
                      isKingInCheck && styles.kingInCheckSquare,
                    ]}
                    onPress={() => onSquarePress(adjustedRow, adjustedCol)}
                  >
                    {showMoves && isValidMove && !square && (
                      <View style={styles.validMoveDot} />
                    )}
                    {square && (
                      <Image 
                        source={pieceImages[square.color === 'w' ? square.type.toUpperCase() : square.type]} 
                        style={styles.pieceImage} 
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
      <View style={styles.playerSection}>
        {/* Captured Pieces - Bottom */}
        {/* <View style={styles.capturedSection}>
          <Text style={styles.capturedLabel}>Captured by White</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.capturedScrollView}
            contentContainerStyle={styles.capturedScrollContent}
          >
            {capturedPieces.black.map((piece, index) => (
              <Image
                key={index}
                source={pieceImages[piece]}
                style={styles.capturedPieceImage}
              />
            ))}
            {capturedPieces.black.length === 0 && (
              <Text style={styles.noCapturedText}>None</Text>
            )}
          </ScrollView>
        </View> */}

        <View style={[styles.playerCard, currentTurn === 'w' && styles.activePlayerCard]}>
          <View style={styles.playerInfo}>
            <View style={styles.playerAvatar}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>White</Text>
              <Text style={styles.statusText}>
                {currentTurn === 'w' ? 'Playing' : 'Waiting'}
              </Text>
            </View>
          </View>
          {mode !== 'unlimited' && (
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, whiteTimer <= 10 ? styles.urgentTimer : null]}>
                {formatTime(whiteTimer)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <TouchableOpacity style={styles.undoButton} onPress={()=>{playClick(),handleUndo()}}>
          <Ionicons name="arrow-undo" size={18} color="#FFFFFF" />
          <Text style={styles.undoButtonText}>Undo</Text>
        </TouchableOpacity>
      </View>

      {/* Minimalistic Sidebar */}
      {isSidebarOpen && (
        <>
          <TouchableOpacity style={styles.overlay} onPress={()=>{playClick(),toggleSidebar()}} />
          <View style={styles.sidebar}>
            <TouchableOpacity style={styles.closeButton} onPress={()=>{playClick(),toggleSidebar()}}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.sidebarTitle}>Settings</Text>

            <TouchableOpacity style={styles.sidebarButton} onPress={()=>{playClick(),handlePauseResume()}}>
              <Ionicons name={isPlay ? "pause" : "play"} size={18} color="#FFFFFF" />
              <Text style={styles.sidebarButtonText}>{pauseName}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarButton} onPress={()=>{playClick(),toggleBoardOrientation()}}>
              <Ionicons name="swap-vertical" size={18} color="#FFFFFF" />
              <Text style={styles.sidebarButtonText}>Flip Board</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarButton} onPress={()=>{playClick(),resetGame()}}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.sidebarButtonText}>Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarButton} onPress={()=>{playClick(),handleExit()}}>
              <Ionicons name="exit" size={18} color="#FFFFFF" />
              <Text style={styles.sidebarButtonText}>Exit</Text>
            </TouchableOpacity>

            <View style={styles.toggleSection}>
              <Text style={styles.sectionTitle}>Options</Text>
              
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Show Moves</Text>
                <TouchableOpacity
                  style={[styles.toggleSwitch, showMoves ? styles.toggleSwitchOn : styles.toggleSwitchOff]}
                  onPress={()=>{playClick(),toggleShowMoves()}}
                >
                  <View style={[styles.toggleKnob, showMoves ? styles.toggleKnobOn : styles.toggleKnobOff]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.colorSection}>
              <Text style={styles.sectionTitle}>Board Colors</Text>
              <View style={styles.colorPalette}>
                <TouchableOpacity 
                  style={styles.colorOption1} 
                  onPress={() => {playClick(),handleColorChange('#EDEDED','#8B5A5A')}} 
                />
                <TouchableOpacity 
                  style={styles.colorOption2} 
                  onPress={() =>{playClick(), handleColorChange('#D3D3D3', '#A9A9A9')}}
                />
                <TouchableOpacity 
                  style={styles.colorOption3} 
                  onPress={() => {playClick(),handleColorChange('#FAF0E6', '#5F9EA0')}}
                />
              </View>
            </View>

            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Move History</Text>
              <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
                {moveHistory.length === 0 ? (
                  <Text style={styles.noHistoryText}>No moves yet</Text>
                ) : (
                  moveHistory.map((move, index) => (
                    <View key={index} style={styles.historyItem}>
                      <Text style={styles.historyText}>
                        {Math.floor(index / 2) + 1}. {move.san}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </>
      )}

      {/* Promotion Modal */}
      <Modal
        visible={promotionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>{playClick(), setPromotionModalVisible(false)}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Promotion</Text>
            <View style={styles.promotionOptions}>
              {['q', 'r', 'b', 'n'].map(piece => (
                <TouchableOpacity
                  key={piece}
                  onPress={() => {playClick(),handlePromotion(piece)}}
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
        visible={gameOverModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {playClick(),setGameOverModalVisible(false)}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="trophy" size={40} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Game Over</Text>
            <Text style={styles.gameOverMessage}>{gameOverMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => {playClick(),handleRematch()}}>
                <Text style={styles.modalButtonText}>Rematch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={() => {playClick(),handleExit()}}>
                <Text style={styles.modalButtonText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exit Modal */}
      <Modal
        visible={exitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>{playClick(), setExitModalVisible(false)}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={40} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Leave Game?</Text>
            <Text style={styles.exitMessage}>Do you want to leave?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() =>{playClick(),handleConfirmExit()}}>
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={() =>{playClick(),handleCancelExit()}}>
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:35,
    backgroundColor: '#000000',
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
  capturedSection: {
    backgroundColor: '#0F0F0F',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 50,
  },
  capturedLabel: {
    color: '#AAAAAA',
    fontSize: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  capturedScrollView: {
    maxHeight: 30,
  },
  capturedScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  capturedPieceImage: {
    width: squareSize * 0.4,
    height: squareSize * 0.4,
    resizeMode: 'contain',
    margin: 2,
  },
  noCapturedText: {
    color: '#666666',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
  boardSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  chessboardContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: '#333333',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: squareSize,
    height: squareSize,
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
    width: squareSize * 0.9,
    height: squareSize * 0.9,
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 998,
  },
  sidebar: {
    position: 'absolute',
    top: 35,
    right: 0,
    bottom: 0,
    width: width * 0.75,
    maxWidth: 280,
    backgroundColor: '#0F0F0F',
    padding: 20,
    zIndex: 999,
    borderLeftWidth: 1,
    borderLeftColor: '#333333',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 10,
  },
  sidebarTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sidebarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  toggleSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSwitch: {
    width: 50,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchOn: {
    backgroundColor: '#555555',
  },
  toggleSwitchOff: {
    backgroundColor: '#333333',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobOn: {
    transform: [{ translateX: 24 }],
  },
  toggleKnobOff: {
    transform: [{ translateX: 0 }],
  },
  colorSection: {
    marginTop: 15,
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  colorOption1: {
    width: 32,
    height: 32,
    backgroundColor: '#8B5A5A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#AAAAAA',
  },
  colorOption2: {
    width: 32,
    height: 32,
    backgroundColor: '#A9A9A9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#AAAAAA',
  },
  colorOption3: {
    width: 32,
    height: 32,
    backgroundColor: '#5F9EA0',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#AAAAAA',
  },
  historySection: {
    marginTop: 15,
    flex: 1,
  },
  historyScroll: {
    maxHeight: 80,
    marginTop: 8,
  },
  historyItem: {
    backgroundColor: '#1A1A1A',
    padding: 6,
    borderRadius: 4,
    marginVertical: 1,
  },
  historyText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  noHistoryText: {
    color: '#666666',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
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