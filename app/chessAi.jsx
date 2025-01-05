import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, Dimensions, ImageBackground } from 'react-native';
import { Chess } from 'chess.js';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';
const { width, height } = Dimensions.get('window');
const backgroundImage = require('../assets/images/home/hbg.png');

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
  const [currentTurn, setCurrentTurn] = useState('w');
  const [kingInCheck, setKingInCheck] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [level, setLevel] = useState('medium');
  const [moveSound, setMoveSound] = useState(null);
  const [captureSound, setCaptureSound] = useState(null);
  const [castleSound, setCastleSound] = useState(null);
  const [promoteSound, setPromoteSound] = useState(null);
  const [checkSound, setCheckSound] = useState(null);

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
    if (chess.inCheck()) {
      const kingPosition = findKingPosition();
      setKingInCheck(kingPosition);
      playSound(checkSound);
    } else {
      setKingInCheck(null);
    }
  }, [gameFEN]);

  useEffect(() => {
    if (currentTurn === 'b' && !gameOverModalVisible) {
      setTimeout(() => aiMove(level), 1500);
    }
  }, [currentTurn, gameOverModalVisible, level]);

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
        // Random move for easy level
        bestMove = moves[Math.floor(Math.random() * moves.length)];
      } else if (level === 'medium') {
        // Choose the move that captures the highest value piece
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
        // Evaluate moves to choose the best move
        bestMove = moves.reduce((best, move) => {
          chess.move(move);
          const evaluation = evaluateBoard(chess);
          chess.undo();
          return evaluation > best.evaluation ? { move, evaluation } : best;
        }, { move: moves[0], evaluation: -Infinity }).move;
      }
      chess.move(bestMove);
      playSound(bestMove.captured ? captureSound : moveSound);
      setGameFEN(chess.fen());
      setCurrentTurn(chess.turn());
    }
  };

  const evaluateBoard = (chess) => {
    const board = chess.board();
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let evaluation = 0;
    board.forEach(row => {
      row.forEach(square => {
        if (square) {
          evaluation += (square.color === 'w' ? 1 : -1) * pieceValues[square.type.toLowerCase()];
        }
      });
    });
    return evaluation;
  };

  const handleExit = () => {
    resetGame();
    navigation.navigate('index');
    setGameOverModalVisible(false);
  };

  const handleLevelChange = (selectedLevel) => {
    setLevel(selectedLevel);
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
            newCapturedPieces[moveResult.color === 'b' ? 'white' : 'black'].push(moveResult.captured);
            setCapturedPieces(newCapturedPieces);
            playSound(captureSound);
          }
           else if (moveResult.flags.includes('k')) {
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
        newCapturedPieces[move.color === 'w' ? 'white' : 'black'].push(move.captured);
        setCapturedPieces(newCapturedPieces);
        playSound(captureSound);
      }
      else {
        playSound(promoteSound);
      }
      setGameFEN(chess.fen());
      setCurrentTurn(chess.turn());

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
    setGameOverModalVisible(false);
  };

  function resetGame() {
    chess.reset();
    setGameFEN(chess.fen());
    setSelectedSquare(null);
    setCapturedPieces({ white: [], black: [] });
    setCurrentTurn('w');
    setKingInCheck(null);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundImage}>
    <View style={styles.container}>

      <View style={styles.action}>
        <View style={styles.levelSelector}>
          <Text style={styles.levelText}>AI Level:</Text>
          <Picker
            selectedValue={level}
            onValueChange={(itemValue) => handleLevelChange(itemValue)}
            style={pickerSelectStyles.inputAndroid}
          >
            <Picker.Item label="Easy" value="easy" />
            <Picker.Item label="Medium" value="medium" />
            <Picker.Item label="Hard" value="hard" />
          </Picker>
        </View>
        <TouchableOpacity onPress={() => toggleSidebar()}>
          <Image source={require('../assets/images/home/setting.png')} style={styles.setting} />
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
       
        </View>
      )}

      <View style={styles.capturedContainer}>
        <View style={styles.user}>
          <Image source={require('../assets/images/pieces/black-rook.png')} style={styles.userImg} />
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
                    (rowIndex + colIndex) % 2 === 0 ? styles.lightSquare : styles.darkSquare,
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
    width:"100%",
    height:"100%",
    marginTop:25,
    padding: 0,
    // justifyContent: "center",
    alignItems: "center",
    objectFit:"cover"
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  
  sidebar:{
    flex:1,
    justifyContent:"space-around",
    alignItems:"center",
    width:width*0.5,
    position:"absolute",
    zIndex:3,
    backgroundColor: 'white',
    borderRadius: 10,
    top:width*0.24,
    left:width*0.48,
    shadowColor: '#000',
  },
  setting:{
    height: width * 0.12,
    width: width * 0.12,

  },
  closeButton:{
    width:"100%",
    flex:1,
    alignItems:"flex-end"
  },
  closeButtonText:{
    width:30,
    height:30,
    color:"white",
    backgroundColor:"red",
    textAlign:"center",
    textAlignVertical:"center"
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
  action: {
    marginTop: height * 0.04,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: height * 0.02,
    padding: 5,
  },
  levelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    color: 'black',
  },
  chessboardContainer: {
    borderWidth: 3,
    borderColor: '#457b',
    width:"100%"
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
    borderColor:"#14213d",
    borderRadius: width * 0.06,
    resizeMode: 'cover',
  },
  square: {
    width: width * 0.124,
    height: width * 0.130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightSquare: {
    backgroundColor: '#EEE',
  },
  darkSquare: {
    backgroundColor: '#444',
  },
  selectedSquare: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  validMoveSquare: {
    backgroundColor: '#90EE90',

    borderColor:"transparent",
    borderRadius:50,
  
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
    backgroundColor: '#f1faee',
  
    borderColor:"#8d99ae",
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
  promotionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: height * 0.02,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputAndroid: {
    width: 130,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 0.5,
    borderColor: 'purple',
    borderRadius: 8,
    color: 'black',
    paddingRight: 0, // to ensure the text is never behind the icon
    backgroundColor: 'white',
  },
});
