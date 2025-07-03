import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, Dimensions, ScrollView, BackHandler } from 'react-native';
import { Chess } from 'chess.js';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

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
      const [move, capture, castle, promote, check] = await Promise.all([
        Audio.Sound.createAsync(require('../assets/sounds/move.mp3')).catch(e => ({ sound: null })),
        Audio.Sound.createAsync(require('../assets/sounds/capture.mp3')).catch(e => ({ sound: null })),
        Audio.Sound.createAsync(require('../assets/sounds/castle.mp3')).catch(e => ({ sound: null })),
        Audio.Sound.createAsync(require('../assets/sounds/promote.mp3')).catch(e => ({ sound: null })),
        Audio.Sound.createAsync(require('../assets/sounds/move-check.mp3')).catch(e => ({ sound: null })),
      ]);
      setMoveSound(move.sound);
      setCaptureSound(capture.sound);
      setCastleSound(castle.sound);
      setPromoteSound(promote.sound);
      setCheckSound(check.sound);
    } catch (error) {
      console.warn('Error loading sounds:', error);
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
        await sound.replayAsync();
      } catch (error) {
        console.warn('Error playing sound:', error);
      }
    }
  };

  // Set initial timers based on game mode
  useEffect(() => {
    let initialTime;
     switch (mode) {
    case 'classic':
      initialTime = 60; // 60 seconds
      break;
    case 'blitz':
      initialTime = 30; // 30 seconds
      break;
    case 'unlimited':
      initialTime = 999999; // Effectively no time limit
      break;
    case 'rush':
      initialTime = 20; // 20 seconds
      break;
    default:
      initialTime = 60; // Fallback
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
        }
        setSelectedSquare(null);
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
    case 'classic':
      initialTime = 60; // 60 seconds
      break;
    case 'blitz':
      initialTime = 30; // 30 seconds
      break;
    case 'unlimited':
      initialTime = 999999; // Effectively no time limit
      break;
    case 'rush':
      initialTime = 20; // 20 seconds
      break;
    default:
      initialTime = 60; // Fallback
  }
  setWhiteTimer(initialTime);
  setBlackTimer(initialTime);
};

const updateTimersAfterMove = () => {
  if (mode === 'classic') {
    setWhiteTimer(60); // Reset to 60s
    setBlackTimer(60);
  } else if (mode === 'rush') {
    setWhiteTimer(20); // Reset to 20s
    setBlackTimer(20);
  } else if (mode === 'blitz') {
    if (currentTurn === 'w') {
      setBlackTimer(prev => Math.min(prev + 2, 30)); // Add 2s, cap at 30s
    } else {
      setWhiteTimer(prev => Math.min(prev + 2, 30)); // Add 2s, cap at 30s
    }
  } else if (mode === 'unlimited') {
    // Do nothing: no time limit
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
      return true; // Prevent default back action
    }
    return false; // Allow default back action
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

  return (
    <View style={styles.container}>
      <View style={styles.action}>
        <TouchableOpacity
  style={styles.undo}
  onPress={handleUndo}
  activeOpacity={0.7} // Adds a fade effect when pressed
>
  <Text style={styles.buttonText}>Undo Move</Text>
</TouchableOpacity>

        <TouchableOpacity onPress={toggleSidebar}>
          <Image source={require('../assets/images/home/setting.png')} style={styles.setting} />
        </TouchableOpacity>
      </View>

      {isSidebarOpen && (
        <View style={styles.sidebar}>
          <TouchableOpacity style={styles.closeButton} onPress={toggleSidebar}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handlePauseResume}>
            <Text style={styles.buttonText}>{pauseName}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={toggleBoardOrientation}>
            <Text style={styles.buttonText}>Flip Board</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={resetGame}>
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleExit}>
            <Text style={styles.buttonText}>Exit</Text>
          </TouchableOpacity>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Show Possible Moves</Text>
            <TouchableOpacity
              style={[styles.toggleSwitch, showMoves ? styles.toggleSwitchOn : styles.toggleSwitchOff]}
              onPress={toggleShowMoves}
            >
              <View style={[styles.toggleKnob, showMoves ? styles.toggleKnobOn : styles.toggleKnobOff]} />
            </TouchableOpacity>
          </View>
          <Text style={styles.boardColor}>Board Color</Text>
          <View style={styles.colorPalate}>
            <TouchableOpacity style={styles.buttonColor1} onPress={() => handleColorChange(  '#EDEDED','#8B5A5A')} />
            <TouchableOpacity style={styles.buttonColor2} onPress={() => handleColorChange('#D3D3D3', '#A9A9A9')} />
            <TouchableOpacity style={styles.buttonColor3} onPress={() => handleColorChange('#FAF0E6', '#5F9EA0')} />
          </View>
          <View style={styles.moveHistoryContainer}>
            <Text style={styles.moveHistoryTitle}>Move History</Text>
            <ScrollView style={styles.moveHistory}>
              {moveHistory.map((move, index) => (
                <Text key={index} style={styles.moveText}>
                  {Math.floor(index / 2) + 1}. {move.san}
                </Text>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      <View style={styles.capturedContainer}>
        <View style={styles.user}>
          <Image source={require('../assets/images/pieces/black-rook.png')} style={styles.userImg} />
          {mode !== 'unlimited' && <Text style={styles.timerText}>{blackTimer}s</Text>}
        </View>
        <View style={styles.capturedPieces}>
          {capturedPieces.white.map((piece, index) => (
            <Image key={index} source={pieceImages[piece.toUpperCase()]} style={styles.capturedPieceImage} />
          ))}
        </View>
      </View>

      <View style={styles.chessboardContainer}>
        {renderBoard.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((square, colIndex) => {
              const adjustedRow = isBoardFlipped ? 7 - rowIndex : rowIndex;
              const adjustedCol = isBoardFlipped ? 7 - colIndex : colIndex;
              const squareName = `${String.fromCharCode(97 + adjustedCol)}${8 - adjustedRow}`;
              return (
                <TouchableOpacity
                  key={`${adjustedRow}-${adjustedCol}`}
                  style={[
                    styles.square,
                    (adjustedRow + adjustedCol) % 2 === 0 ? { backgroundColor: selectedColor.light } : { backgroundColor: selectedColor.dark },
                    selectedSquare === squareName && styles.selectedSquare,
                    kingInCheck === squareName && styles.kingInCheckSquare,
                    showMoves && validMoves.includes(squareName) && styles.validMoveSquare,
                  ]}
                  onPress={() => onSquarePress(adjustedRow, adjustedCol)}
                >
                  {showMoves && validMoves.includes(squareName) && (
                    <Image source={greenDotImage} style={styles.validMoveDot} />
                  )}
                  {square && <Image source={pieceImages[square.color === 'w' ? square.type.toUpperCase() : square.type]} style={styles.pieceImage} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.capturedContainer}>
        <View style={styles.capturedPieces}>
          {capturedPieces.black.map((piece, index) => (
            <Image key={index} source={pieceImages[piece.toLowerCase()]} style={styles.capturedPieceImage} />
          ))}
        </View>
        <View style={styles.user}>
          <Image source={require('../assets/images/pieces/white-rook.png')} style={styles.userImg} />
          {mode !== 'unlimited' && <Text style={styles.timerText}>{whiteTimer}s</Text>}
        </View>
      </View>

      <Modal transparent animationType="slide" visible={promotionModalVisible} onRequestClose={() => setPromotionModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a piece for promotion:</Text>
            <View style={styles.promotionOptions}>
              {['q', 'r', 'b', 'n'].map(piece => (
                <TouchableOpacity key={piece} onPress={() => handlePromotion(piece)}>
                  <Image source={pieceImages[piece]} style={styles.pieceImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={gameOverModalVisible} onRequestClose={() => setGameOverModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{gameOverMessage}</Text>
            <TouchableOpacity style={styles.button} onPress={handleRematch}>
              <Text style={styles.buttonText}>Rematch</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleExit}>
              <Text style={styles.buttonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
  transparent={true}
  animationType="slide"
  visible={exitModalVisible}
  onRequestClose={() => setExitModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Do you want to leave?</Text>
      <View style={styles.modalButtonContainer}>
        <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirmExit}>
          <Text style={styles.buttonText}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancelExit}>
          <Text style={styles.buttonText}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F', alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  action: {display:"flex",flexDirection:"row",justifyContent:"space-between",width:"100%",margin:0,position:"absolute",top:30,padding:10 },
  setting: { width: 40, height: 40, },
  sidebar: {
    position: 'absolute', top: 80, right: 20, width: width * 0.6, backgroundColor: '#2A2A2A', borderRadius: 20, padding: 20, zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 10,
  },
 undo: {
  backgroundColor: '#2A2A2A', // Charcoal gray background
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginVertical: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
},
buttonText: {
  color: '#EDEDED', // Soft pearl text
  fontSize: 16,
  fontWeight: '600',
}
,
  closeButton: { alignSelf: 'flex-end', padding: 10 },
  closeButtonText: { color: '#B76E79', fontSize: 20, fontWeight: 'bold', backgroundColor: 'white', borderRadius: 15, width: 30, height: 30, textAlign: 'center', lineHeight: 30 },
  button: { backgroundColor: '#B76E79', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, marginVertical: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  buttonText: { color: '#EDEDED', fontSize: 16, fontWeight: '600', textTransform: 'uppercase' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
  toggleLabel: { color: '#EDEDED', fontSize: 16, fontWeight: '600' },
  toggleSwitch: { width: 50, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  toggleSwitchOn: { backgroundColor: '#B76E79' },
  toggleSwitchOff: { backgroundColor: '#4A4A4A' },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EDEDED' },
  toggleKnobOn: { transform: [{ translateX: 22 }] },
  toggleKnobOff: { transform: [{ translateX: 0 }] },
  boardColor: { color: '#EDEDED', fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 10, textAlign: 'center' },
  colorPalate: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10 },
  buttonColor1: { width: 40, height: 40, backgroundColor: '#8B5A5A', borderRadius: 20, borderWidth: 2, borderColor: '#B76E79' },
  buttonColor2: { width: 40, height: 40, backgroundColor: '#A9A9A9', borderRadius: 20, borderWidth: 2, borderColor: '#B76E79' },
  buttonColor3: { width: 40, height: 40, backgroundColor: '#5F9EA0', borderRadius: 20, borderWidth: 2, borderColor: '#B76E79' },
  chessboardContainer: { backgroundColor: '#2A2A2A', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8, width: width * 0.95 },
  row: { flexDirection: 'row' },
  square: { width: width * 0.118, height: width * 0.118, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  selectedSquare: { backgroundColor: 'rgba(122, 161, 142, 0.5)', borderWidth: 3, borderColor: 'rgba(0, 255, 85, 0.61)' },
  validMoveSquare: { borderWidth: 2, borderColor: 'rgba(0, 255, 85, 0.88)' },
  validMoveDot: { width: width * 0.1, height: width * 0.1, resizeMode: 'contain', position: 'absolute', zIndex: 1 },
  kingInCheckSquare: { backgroundColor: '#DC143C' },
  pieceImage: { width: width * 0.105, height: width * 0.105, resizeMode: 'contain', zIndex: 2 },
  capturedContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', paddingVertical: 10, paddingHorizontal: 15, marginVertical: 10, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3 },
  capturedPieces: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: '60%', justifyContent: 'flex-start' },
  capturedPieceImage: { width: width * 0.06, height: width * 0.06, resizeMode: 'contain', margin: 5 },
  user: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1C', padding: 8, borderRadius: 10 },
  userImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#B76E79', marginRight: 10 },
  timerText: { fontSize: 18, fontWeight: 'bold', color: '#EDEDED' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 15, 15, 0.8)' },
  modalContent: { width: width * 0.85, backgroundColor: '#2A2A2A', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#EDEDED', marginBottom: 20, textAlign: 'center' },
  promotionOptions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 20 },
  moveHistoryContainer: { marginTop: 20, width: '100%' },
  moveHistoryTitle: { color: '#EDEDED', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  moveHistory: { maxHeight: 100 },
  moveText: { color: '#EDEDED', fontSize: 14 },
  confirmButton: {
  backgroundColor: '#B76E79',
  marginRight: 10,
},
cancelButton: {
  backgroundColor: '#4A4A4A',
},
modalButtonContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
},
});