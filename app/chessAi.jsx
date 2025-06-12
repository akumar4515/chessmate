import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, Dimensions, ScrollView, BackHandler } from 'react-native';
import { Chess } from 'chess.js';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');
const squareSize = Math.min(width * 0.113, 45); // Responsive square size

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

const initialPieces = {
  white: ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  black: ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
};

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
  const [level, setLevel] = useState('medium');
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

  useEffect(() => {
    loadSounds();
    return () => unloadSounds();
  }, []);

  const loadSounds = async () => {
    try {
      const [move, capture, castle, promote, check] = await Promise.all([
        Audio.Sound.createAsync(require('../assets/sounds/move.mp3')).catch(() => ({ sound: null })),
        Audio.Sound.createAsync(require('../assets/sounds/capture.mp3')).catch(() => ({ sound: null })),
        Audio.Sound.createAsync(require('../assets/sounds/castle.mp3')).catch(() => ({ sound: null })),
        Audio.Sound.createAsync(require('../assets/sounds/promote.mp3')).catch(() => ({ sound: null })),
        Audio.Sound.createAsync(require('../assets/sounds/move-check.mp3')).catch(() => ({ sound: null })),
      ]);
      setMoveSound(move.sound);
      setCaptureSound(capture.sound);
      setCastleSound(castle.sound);
      setPromoteSound(promote.sound);
      setCheckSound(check.sound);
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  };

  const unloadSounds = async () => {
    await Promise.all([
      moveSound?.unloadAsync(),
      captureSound?.unloadAsync(),
      castleSound?.unloadAsync(),
      promoteSound?.unloadAsync(),
      checkSound?.unloadAsync(),
    ].filter(Boolean));
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

  useEffect(() => {
    let timer;
    if (isPlay && !gameOverModalVisible && !promotionModalVisible && mode !== 'unlimited') {
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
  }, [currentTurn, gameOverModalVisible, promotionModalVisible, isPlay, mode]);

  useEffect(() => {
    if (chess.inCheck()) {
      const kingPosition = findKingPosition();
      setKingInCheck(kingPosition);
      playSound(checkSound);
    } else {
      setKingInCheck(null);
    }
  }, [gameFEN]);

  useEffect(() => {
    if (currentTurn === 'b' && !gameOverModalVisible && isPlay) {
      setTimeout(() => aiMove(level), 1500);
    }
  }, [currentTurn, gameOverModalVisible, level, isPlay]);

  const findKingPosition = () => {
    for (let rowIndex = 0; rowIndex < board.length; rowIndex++) {
      for (let colIndex = 0; colIndex < board[rowIndex].length; colIndex++) {
        const square = board[rowIndex][colIndex];
        if (square && square.type === 'k' && square.color === chess.turn()) {
          return `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
        }
      }
    }
    return null;
  };

  const aiMove = (level) => {
    const moves = chess.moves({ verbose: true });
    if (moves.length > 0) {
      let bestMove;
      if (level === 'easy') {
        bestMove = moves[Math.floor(Math.random() * moves.length)];
      } else if (level === 'medium') {
        bestMove = moves[0];
        let highestValue = 0;
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        moves.forEach(move => {
          if (move.captured) {
            const value = pieceValues[move.captured.toLowerCase()];
            if (value > highestValue) {
              highestValue = value;
              bestMove = move;
            }
          }
        });
      } else if (level === 'hard') {
        bestMove = moves.reduce((best, move) => {
          chess.move(move);
          const evaluation = evaluateBoard(chess);
          chess.undo();
          return evaluation > best.evaluation ? { move, evaluation } : best;
        }, { move: moves[0], evaluation: -Infinity }).move;
      }
      const moveResult = chess.move(bestMove);
      if (moveResult) {
        setGameFEN(chess.fen());
        setCurrentTurn(chess.turn());
        const newCapturedPieces = calculateCapturedPieces();
        setCapturedPieces(newCapturedPieces);
        if (moveResult.captured) {
          playSound(captureSound);
        } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
          playSound(castleSound);
        } else {
          playSound(moveSound);
        }
        updateTimersAfterMove();
        updateMoveHistory();
        checkGameOver();
      }
    }
  };

  const evaluateBoard = (chess) => {
  const board = chess.board();
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let evaluation = 0;
  board.forEach(row => {
    row.forEach(square => {
      if (square) {
        evaluation += (square.color === 'w' ? pieceValues[square.type.toLowerCase()] : -pieceValues[square.type.toLowerCase()]);
      }
    });
  });
  return evaluation;
};

  const calculateCapturedPieces = () => {
    const currentPieces = { white: [], black: [] };
    const board = chess.board();
    board.forEach(row => {
      row.forEach(square => {
        if (square) {
          if (square.color === 'w') {
            currentPieces.white.push(square.type.toUpperCase());
          } else {
            currentPieces.black.push(square.type);
          }
        }
      });
    });
    return {
      white: initialPieces.black.filter(piece => !currentPieces.black.includes(piece)),
      black: initialPieces.white.filter(piece => !currentPieces.white.includes(piece)),
    };
  };

  const handleExit = () => {
    setExitModalVisible(true);
  };

  const handleConfirmExit = () => {
    resetGame();
    navigation.navigate('index'); // Updated to 'Home' for consistency
    setExitModalVisible(false);
    setGameOverModalVisible(false);
  };

  const handleCancelModal = () => {
    setExitModalVisible(false);
  };

  useEffect(() => {
    const backAction = () => {
      if (!gameOverModalVisible && !promotionModalVisible && !exitModalVisible) {
        setExitModalVisible(true);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [gameOverModalVisible, promotionModalVisible, exitModalVisible]);

  const handleLevelChange = (selectedLevel) => {
    setLevel(selectedLevel);
  };

  const onSquarePress = (rowIndex, colIndex) => {
    if (!isPlay || currentTurn !== 'w') return; // Restrict to player's turn
    const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
    const piece = chess.get(square);

    if (selectedSquare) {
      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const possibleMoves = chess.moves({ square: selectedSquare, verbose: true });
      const move = possibleMoves.find(m => m.to === square);

      if (move) {
        const moveResult = chess.move({ from: selectedSquare, to: square, promotion: 'q' });

        if (moveResult) {
          setGameFEN(chess.fen());
          setCurrentTurn(chess.turn());
          const newCapturedPieces = calculateCapturedPieces();
          setCapturedPieces(newCapturedPieces);
          if (moveResult.captured) {
            playSound(captureSound);
          } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
            playSound(castleSound);
          } else if (moveResult.flags.includes('e')) {
            playSound(captureSound);
          } else {
            playSound(moveSound);
          }

          if (moveResult.flags.includes('p')) {
            chess.undo();
            setPromotionMove({ from: selectedSquare, to: square });
            setPromotionModalVisible(true);
          } else {
            updateTimersAfterMove();
            updateMoveHistory();
            checkGameOver();
          }
        }
        setSelectedSquare(null);
      } else if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
      }
    } else if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
    }
  };

  const handlePromotion = (promotionPiece) => {
    if (promotionMove) {
      const move = chess.move({ from: promotionMove.from, to: promotionMove.to, promotion: promotionPiece });
      setGameFEN(chess.fen());
      setCurrentTurn(chess.turn());
      const newCapturedPieces = calculateCapturedPieces();
      setCapturedPieces(newCapturedPieces);
      if (move.captured) {
        playSound(captureSound);
      } else {
        playSound(promoteSound);
      }
      updateTimersAfterMove();
      updateMoveHistory();
      setPromotionMove(null);
      setPromotionModalVisible(false);
      checkGameOver();
    }
  };

  const handleRematch = () => {
    resetGame();
    setPauseName("Pause");
    setGameOverModalVisible(false);
  };

  const handleUndo = () => {
    const historyLength = chess.history().length;
    if (historyLength >= 2) {
      chess.undo(); // Undo AI's move
      chess.undo(); // Undo player's move
    } else if (historyLength === 1) {
      chess.undo(); // Undo player's move
    }
    setGameFEN(chess.fen());
    setSelectedSquare(null);
    setCurrentTurn(chess.turn());
    const newCapturedPieces = calculateCapturedPieces();
    setCapturedPieces(newCapturedPieces);
    updateMoveHistory();
    if (chess.inCheck()) {
      setKingInCheck(findKingPosition());
    } else {
      setKingInCheck(null);
    }
    checkGameOver();
  };

  const resetGame = () => {
    chess.reset();
    setGameFEN(chess.fen());
    setSelectedSquare(null);
    setCapturedPieces({ white: [], black: [] });
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
    setCurrentTurn('w');
    setKingInCheck(null);
    setIsPlay(true);
    setPauseName("Pause");
    setMoveHistory([]);
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
    } else if (mode === 'unlimited') {
      // No timer update
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

  const handlePauseResume = () => {
    const newIsPlay = !isPlay;
    setIsPlay(newIsPlay);
    setPauseName(newIsPlay ? "Resume" : "Pause");
    setSelectedSquare(null);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleShowMoves = () => setShowMoves(prev => !prev);
  const toggleBoardOrientation = () => setIsBoardFlipped(!isBoardFlipped);
  const handleColorChange = (light, dark) => setSelectedColor({ light, dark });

  const renderBoard = isBoardFlipped ? board.slice().reverse() : board;

  return (
    <View style={styles.container}>
      <View style={styles.action}>
        <View style={styles.levelSelector}>
          <Text style={styles.levelText}>AI Level:</Text>
          <Picker
            selectedValue={level}
            onValueChange={handleLevelChange}
            style={pickerSelectStyles.inputAndroid}
          >
            <Picker.Item label="Easy" value="easy" />
            <Picker.Item label="Medium" value="medium" />
            <Picker.Item label="Hard" value="hard" />
          </Picker>
        </View>
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
          <TouchableOpacity style={styles.button} onPress={handleUndo}>
            <Text style={styles.buttonText}>Undo Move</Text>
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
            <TouchableOpacity style={styles.buttonColor1} onPress={() => handleColorChange('#FFFACD', '#8B4513')} />
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
          {capturedPieces.black.map((piece, index) => (
            <Image key={index} source={pieceImages[piece]} style={styles.capturedPieceImage} />
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
                  onPress={() => onSquarePress(adjustedRow, colIndex)}
                >
                  {showMoves && validMoves.includes(squareName) && (
                    <Image source={greenDotImage} style={styles.validMoveDot} />
                  )}
                  {square && (
                    <Image source={pieceImages[square.color === 'w' ? square.type.toUpperCase() : square.type]} style={styles.pieceImage} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.capturedContainer}>
        <View style={styles.capturedPieces}>
          {capturedPieces.white.map((piece, index) => (
            <Image key={index} source={pieceImages[piece]} style={styles.capturedPieceImage} />
          ))}
        </View>
        <View style={styles.user}>
          <Image source={require('../assets/images/pieces/white-rook.png')} style={styles.userImg} />
          {mode !== 'unlimited' && <Text style={styles.timerText}>{whiteTimer}s</Text>}
        </View>
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={promotionModalVisible}
        onRequestClose={() => setPromotionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a piece for promotion:</Text>
            <View style={styles.promotionOptions}>
              {['q', 'r', 'b', 'n'].map(piece => (
                <TouchableOpacity key={piece} onPress={() => handlePromotion(piece)}>
                  <Image source={pieceImages[currentTurn === 'w' ? piece.toUpperCase() : piece]} style={styles.pieceImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={gameOverModalVisible}
        onRequestClose={() => setGameOverModalVisible(false)}
      >
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
        transparent
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
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancelModal}>
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
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: height * 0.05,
    paddingHorizontal: 10,
  },
  action: {
    position: 'absolute',
    top: height * 0.03,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    zIndex: 10,
  },
  setting: {
    width: 36,
    height: 36,
    tintColor: '#EDEDED',
  },
  levelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EDEDED',
    marginRight: 8,
  },
  sidebar: {
    position: 'absolute',
    top: height * 0.1,
    right: 15,
    width: Math.min(width * 0.55, 280),
    maxHeight: height * 0.65,
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    padding: 15,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  closeButtonText: {
    color: '#B76E79',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#B76E79',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 15,
    marginVertical: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#EDEDED',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    width: '100%',
  },
  toggleLabel: {
    color: '#EDEDED',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSwitch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchOn: {
    backgroundColor: '#B76E79',
  },
  toggleSwitchOff: {
    backgroundColor: '#4A4A4A',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EDEDED',
  },
  toggleKnobOn: {
    transform: [{ translateX: 20 }],
  },
  toggleKnobOff: {
    transform: [{ translateX: 0 }],
  },
  boardColor: {
    color: '#EDEDED',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  colorPalate: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  buttonColor1: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFACD',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#B76E79',
  },
  buttonColor2: {
    width: 36,
    height: 36,
    backgroundColor: '#D3D3D3',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#B76E79',
  },
  buttonColor3: {
    width: 36,
    height: 36,
    backgroundColor: '#FAF0E6',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#B76E79',
  },
  chessboardContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    width: squareSize * 8 + 8,
    alignSelf: 'center',
    marginVertical: height * 0.02,
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: squareSize,
    height: squareSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  selectedSquare: {
    backgroundColor: 'rgba(122, 161, 142, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 85, 0.61)',
    borderRadius: 4,
  },
  validMoveSquare: {
    borderWidth: 2,
    borderColor: '#00FF62',
    borderRadius: 4,
  },
  validMoveDot: {
    width: squareSize * 0.8,
    height: squareSize * 0.8,
    resizeMode: 'contain',
    position: 'absolute',
    zIndex: 1,
  },
  kingInCheckSquare: {
    backgroundColor: '#DC143C',
    borderRadius: 4,
  },
  pieceImage: {
    width: squareSize * 0.9,
    height: squareSize * 0.9,
    resizeMode: 'contain',
    zIndex: 2,
  },
  capturedContainer: {
    width: '95%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: height * 0.015,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  capturedPieces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: '60%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  capturedPieceImage: {
    width: squareSize * 0.5,
    height: squareSize * 0.5,
    resizeMode: 'contain',
    margin: 3,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    padding: 6,
    borderRadius: 10,
    minWidth: 60, // Prevent layout shift
  },
  userImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#B76E79',
    marginRight: 6,
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EDEDED',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 15, 0.8)',
    zIndex: 30,
  },
  modalContent: {
    width: Math.min(width * 0.85, 300),
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EDEDED',
    marginBottom: 16,
    textAlign: 'center',
  },
  promotionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 12,
  },
  moveHistoryContainer: {
    marginTop: 16,
    width: '100%',
  },
  moveHistoryTitle: {
    color: '#EDEDED',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moveHistory: {
    maxHeight: height * 0.15,
  },
  moveText: {
    color: '#EDEDED',
    fontSize: 12,
    marginVertical: 2,
  },
  confirmButton: {
    backgroundColor: '#B76E79',
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: '#4A4A4A',
    flex: 1,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputAndroid: {
    width: 100,
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    color: '#EDEDED',
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#B76E79',
  },
});