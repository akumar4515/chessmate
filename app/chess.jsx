import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, Dimensions, ImageBackground } from 'react-native';
import { Chess } from 'chess.js';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');
const backgroundImage = require('../assets/images/background.png');

const pieceImages = {
  'r': require('../assets/images/pieces/black-rook.png'),
  'n': require('../assets/images/pieces/black-night.png'),
  'b': require('../assets/images/pieces/black-bishop.png'),
  'q': require('../assets/images/pieces/black-queen.png'),
  'k': require('../assets/images/pieces/black-king.png'),
  'p': require('../assets/images/pieces/black-pawn.png'),
  'R': require('../assets/images/pieces/white-rook.png'),
  'N': require('../assets/images/pieces/white-night.png'),
  'B': require('../assets/images/pieces/white-bishop.png'),
  'Q': require('../assets/images/pieces/white-queen.png'),
  'K': require('../assets/images/pieces/white-king.png'),
  'P': require('../assets/images/pieces/white-pawn.png'),
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
  const [pauseName, setPauseName] = useState("Pause");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlay, setIsPlay] = useState(true);
  const [moveSound, setMoveSound] = useState(null);
  const [captureSound, setCaptureSound] = useState(null);
  const [castleSound, setCastleSound] = useState(null);
  const [promoteSound, setPromoteSound] = useState(null);
  const [checkSound, setCheckSound] = useState(null);
  const [selectedColor, setSelectedColor] = useState({ light: '#EEE', dark: '#444' });

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
    const [move, capture, castle, promote, check] = await Promise.all([
      Audio.Sound.createAsync(require('../assets/sounds/move.mp3')),
      Audio.Sound.createAsync(require('../assets/sounds/capture.mp3')),
      Audio.Sound.createAsync(require('../assets/sounds/castle.mp3')),
      Audio.Sound.createAsync(require('../assets/sounds/promote.mp3')),
      Audio.Sound.createAsync(require('../assets/sounds/move-check.mp3')),
    ]);
    setMoveSound(move.sound);
    setCaptureSound(capture.sound);
    setCastleSound(castle.sound);
    setPromoteSound(promote.sound);
    setCheckSound(check.sound);
  };

  const unloadSounds = async () => {
    if (moveSound) await moveSound.unloadAsync();
    if (captureSound) await captureSound.unloadAsync();
    if (castleSound) await castleSound.unloadAsync();
    if (promoteSound) await promoteSound.unloadAsync();
    if (checkSound) await checkSound.unloadAsync();
  };

  const playSound = async (sound) => {
    if (sound) {
      await sound.replayAsync();
    }
  };

  useEffect(() => {
    let initialTime;
    switch (mode) {
      case 'classic':
        initialTime = 60; // 60 seconds per move
        break;
      case 'blitz':
        initialTime = 300; // 5 minutes
        break;
      case 'tempo':
        initialTime = 20; // 20 seconds per move
        break;
      case 'blitz3m':
        initialTime = 180; // 3 minute
        break;
      default:
        initialTime = 60; // Default to 60 seconds if mode is unknown
    }
    setWhiteTimer(initialTime);
    setBlackTimer(initialTime);
  }, [mode]);

  useEffect(() => {
    let timer;

    if (isPlay && !gameOverModalVisible) {
      if (currentTurn === 'w') {
        timer = setInterval(() => {
          setWhiteTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setGameOverMessage('Black wins! White ran out of time.');
              setGameOverModalVisible(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (currentTurn === 'b') {
        timer = setInterval(() => {
          setBlackTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setGameOverMessage('White wins! Black ran out of time.');
              setGameOverModalVisible(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => clearInterval(timer);
  }, [currentTurn, gameOverModalVisible, isPlay]);

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

  const handleExit = () => {
    resetGame();
    navigation.navigate('index');
    setGameOverModalVisible(false);
  };

  const pauseGame = () => {
    setIsPlay(pauseName === "Pause" ? false : true);
    setPauseName(pauseName === "Pause" ? "Play" : "Pause");
  };

  const onSquarePress = (rowIndex, colIndex) => {
    const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const possibleMoves = chess.moves({ square: selectedSquare, verbose: true });
      const move = possibleMoves.find(m => m.to === square);

      if (move) {
        const moveResult = chess.move({ from: selectedSquare, to: square, promotion: 'q' });

        if (moveResult) {
          if (moveResult.captured) {
            const newCapturedPieces = { ...capturedPieces };
            newCapturedPieces[moveResult.color === 'w' ? 'black' : 'white'].push(moveResult.captured);
            setCapturedPieces(newCapturedPieces);
            playSound(captureSound);
          } else if (moveResult.flags.includes('k')) {
            playSound(castleSound);
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
            setIsPlay(true);

            if (mode === 'classic') {
              setWhiteTimer(60);
              setBlackTimer(60);
            } else if (mode === 'tempo') {
              setWhiteTimer(20);
              setBlackTimer(20);
            }

            if (chess.isCheckmate()) {
              setGameOverMessage(`${chess.turn() === 'w' ? 'Black' : 'White'} wins!`);
              setGameOverModalVisible(true);
            } else if (chess.isDraw()) {
              setGameOverMessage('The game is a draw!');
              setGameOverModalVisible(true);
            }
          }
        }
      }

      setSelectedSquare(null);
    } else {
      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
      }
    }
  };

  const handlePromotion = (promotionPiece) => {
    if (promotionMove) {
      const move = chess.move({ from: promotionMove.from, to: promotionMove.to, promotion: promotionPiece });
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
      setIsPlay(true);

      if (mode === 'classic') {
        setWhiteTimer(60);
        setBlackTimer(60);
      } else if (mode === 'tempo') {
        setWhiteTimer(20);
        setBlackTimer(20);
      }

      setPromotionMove(null);
      setPromotionModalVisible(false);
      if (chess.isCheckmate()) {
        setGameOverMessage(`${chess.turn() === 'w' ? 'Black' : 'White'} wins!`);
        setGameOverModalVisible(true);
      } else if (chess.isDraw()) {
        setGameOverMessage('The game is a draw!');
        setGameOverModalVisible(true);
      }
    }
  };

  const handleRematch = () => {
    resetGame();
    setPauseName("Pause");
    setGameOverModalVisible(false);
  };

  function resetGame() {
    chess.reset();
    setGameFEN(chess.fen());
    setSelectedSquare(null);
    setCapturedPieces({ white: [], black: [] });
    resetTimersToInitial();
    setCurrentTurn('w');
    setKingInCheck(null);
    setPauseName("Pause");
  }

  const resetTimersToInitial = () => {
    let initialTime;
    switch (mode) {
      case 'classic':
        initialTime = 60;
        break;
      case 'blitz':
        initialTime = 300;
        break;
      case 'tempo':
        initialTime = 20;
        break;
      case 'blitz3m':
        initialTime = 180;
        break;
      default:
        initialTime = 60;
    }
    setWhiteTimer(initialTime);
    setBlackTimer(initialTime);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleColorChange = (lightColor, darkColor) => {
    setSelectedColor({ light: lightColor, dark: darkColor });
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundImage}>
    <View style={styles.container}>
   
      <Image
            source={require("../assets/images/home/chessmate.png")}
            style={styles.chessmateImg}
          />

      <View style={styles.action}>
        <TouchableOpacity onPress={() => toggleSidebar()}>
          <Image source={require('../assets/images/home/setting.png')} style={styles.userImg} />
        </TouchableOpacity>
      </View>

      {isSidebarOpen && (
        <View style={styles.sidebar}>
          <TouchableOpacity style={styles.closeButton} onPress={toggleSidebar}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleExit()}>
            <Text style={styles.buttonText}>Exit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => resetGame()}>
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
          
          <Text style={styles.boardColor}>board color</Text>
          <View style={styles.colorPalate}>
          <TouchableOpacity style={styles.buttonColor1} onPress={() => handleColorChange('#FFFACD', '#8B4513')}>           
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonColor2} onPress={() => handleColorChange('#D3D3D3', '#A9A9A9')}>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonColor3} onPress={() => handleColorChange('#FAF0E6', '#5F9EA0')}>
          </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.capturedContainer}>
        <View style={styles.user}>
          <Image source={require('../assets/images/pieces/black-rook.png')} style={styles.userImg} />
          <Text style={styles.timerText}> {blackTimer}s</Text>
        </View>
        <View style={styles.capturedPieces}>
          {capturedPieces.white.map((piece, index) => (
            <Image key={index} source={pieceImages[piece.toUpperCase()]} style={styles.capturedPieceImage} />
          ))}
        </View>
      </View>

      <View style={styles.chessboardContainer}>
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((square, colIndex) => {
              const squareName = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
              return (
                <TouchableOpacity
                  key={`${rowIndex}-${colIndex}`}
                  style={[
                    styles.square,
                    (rowIndex + colIndex) % 2 === 0 ? { backgroundColor: selectedColor.light } : { backgroundColor: selectedColor.dark },
                    selectedSquare === squareName ? styles.selectedSquare : null,
                    validMoves.includes(squareName) ? styles.validMoveSquare : null,
                    kingInCheck === squareName ? styles.kingInCheckSquare : null,
                  ]}
                  onPress={() => onSquarePress(rowIndex, colIndex)}
                >
                  {square && square.type ? (
                    <Image source={pieceImages[square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase()]} style={styles.pieceImage} />
                  ) : null}
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
          <Text style={styles.timerText}> {whiteTimer}s</Text>
        </View>
      </View>

      <Modal
        transparent={true}
        animationType="slide"
        visible={promotionModalVisible}
        onRequestClose={() => setPromotionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a piece for promotion:</Text>
            <View style={styles.promotionOptions}>
              {['q', 'r', 'b', 'n'].map((piece) => (
                <TouchableOpacity key={piece} onPress={() => handlePromotion(piece)}>
                  <Image source={pieceImages[piece]} style={styles.pieceImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
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
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
    objectFit: "cover"
  },
  nameTitle:{
    flex: 1,
    alignItems: "center",
    marginTop: 20,

  },
  chessmateImg: {
    width: 250,
    height: 60,
    resizeMode: "contain",
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sidebar: {
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    width: width * 0.5,
    position: "absolute",
    zIndex: 3,
    backgroundColor: 'white',
    borderRadius: 10,
    top: width * 0.24,
    left: width * 0.48,
    shadowColor: '#000',
  },
  closeButton: {
    width: "100%",
    flex: 1,
    alignItems: "flex-end"
  },
  closeButtonText: {
    width: 30,
    height: 30,
    color: "white",
    backgroundColor: "red",
    textAlign: "center",
    textAlignVertical: "center"
  },
  action: {
    marginTop:0,
  
    width: '100%',
    display: 'flex',
    flexDirection:"row",
    justifyContent:"flex-end",
    
    marginBottom: height * 0.02,
  },
  colorPalate:{
flex:0,
    flexDirection:"row",
    marginTop:10,
    marginBottom:10,
   justifyContent:"space-between",
   gap:10,


  },
  boardColor:{
    fontWeight:"900"


  },
  buttonColor1:{
    width: 50,
    height:50,
    
    backgroundColor:"#8B4513",
    borderRadius:50,

  },
  buttonColor2:{
    width: 50,
    height:50,
    
    backgroundColor:"#A9A9A9",
    borderRadius:50,

  },
  buttonColor3:{
    width: 50,
    height:50,
    
    backgroundColor:"#5F9EA0",
    borderRadius:50,

  },
  chessboardContainer: {
    borderWidth: 10,
    borderColor: '#5D3FD3',
    width: "100%"
  },
  row: {
    flexDirection: 'row',
  },
  user: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.03,
  },
  timerText: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: 'white',
  },
  userImg: {
    height: width * 0.12,
    width: width * 0.12,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: width * 0.06,
    resizeMode: 'contain',
  },
  square: {
    width: width * 0.12,
    height: width * 0.12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSquare: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  validMoveSquare: {
    backgroundColor: '#90EE90',
  },
  kingInCheckSquare: {
    backgroundColor: '#FF6347',
  },
  pieceImage: {
    width: width * 0.12,
    height: width * 0.12,
    resizeMode: 'contain',
  },
  button: {
    width: 100,
    marginTop: height * 0.01,
    margin: width * 0.02,
    padding: width * 0.02,
    backgroundColor: '#AA4A44',
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  capturedContainer: {
    width: '100%',
    height: height * 0.12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#5D3FD3',
    borderColor:"white",
    borderWidth:3,
    paddingHorizontal: width * 0.05,
  },
  capturedPieces: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    maxWidth: '80%',
  },
  capturedPieceImage: {
    width: width * 0.08,
    height: width * 0.08,
    resizeMode: 'contain',
    marginHorizontal: width * 0.02,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.8,
    padding: height * 0.03,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    marginBottom: height * 0.02,
    textAlign: 'center',
  },
  promotionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: height * 0.02,
  },
});
