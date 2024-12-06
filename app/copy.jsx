// import React, { useState } from 'react';
// import { StyleSheet, View, Text, TouchableOpacity, Image, Alert, Modal } from 'react-native';
// import { Chess } from 'chess.js';
// import { useNavigation } from '@react-navigation/native';

// const pieceImages = {
//   'r': require('../assets/images/pieces/black-rook.png'),
//   'n': require('../assets/images/pieces/black-night.png'),
//   'b': require('../assets/images/pieces/black-bishop.png'),
//   'q': require('../assets/images/pieces/black-queen.png'),
//   'k': require('../assets/images/pieces/black-king.png'),
//   'p': require('../assets/images/pieces/black-pawn.png'),
//   'R': require('../assets/images/pieces/white-rook.png'),
//   'N': require('../assets/images/pieces/white-night.png'),
//   'B': require('../assets/images/pieces/white-bishop.png'),
//   'Q': require('../assets/images/pieces/white-queen.png'),
//   'K': require('../assets/images/pieces/white-king.png'),
//   'P': require('../assets/images/pieces/white-pawn.png'),
// };

// export default function ChessApp() {
//   const [chess] = useState(new Chess());
//   const [gameFEN, setGameFEN] = useState(chess.fen());
//   const [selectedSquare, setSelectedSquare] = useState(null);
//   const [promotionModalVisible, setPromotionModalVisible] = useState(false);
//   const [promotionMove, setPromotionMove] = useState(null);
//   const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
//   const [gameOverMessage, setGameOverMessage] = useState('');

//   const navigation = useNavigation();

//   const board = chess.board();
//   const validMoves = selectedSquare ? chess.moves({ square: selectedSquare, verbose: true }).map(move => move.to) : [];
  
//   // Find the king's position if it's in check
//   let kingInCheck = null;
//   if (chess.inCheck()) {
//     for (let rowIndex = 0; rowIndex < board.length; rowIndex++) {
//       for (let colIndex = 0; colIndex < board[rowIndex].length; colIndex++) {
//         const square = board[rowIndex][colIndex];
//         if (square && square.type === 'k' && square.color === chess.turn()) {
//           kingInCheck = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
//         }
//       }
//     }
//   }

//   const handleExit=()=>{
//     resetGame();
//     navigation.navigate('index');
//     setGameOverModalVisible(false);



//   }

//   const onSquarePress = (rowIndex, colIndex) => {
//     const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
//     if (selectedSquare) {
//       // Try to move the piece
//       if (selectedSquare === square) {
//         // Deselect if the same square is clicked
//         setSelectedSquare(null);
//         return;
//       }
//       const move = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
//       if (move !== null) {
//         if (move.flags.includes('p')) {
//           // If the move is a pawn promotion, show the promotion dialog
//           chess.undo(); // Undo the move to allow promotion selection
//           setPromotionMove({ from: selectedSquare, to: square });
//           setPromotionModalVisible(true);
//         } else {
//           setGameFEN(chess.fen());
//           if (chess.isCheckmate()) {
//             setGameOverMessage(`${chess.turn() === 'w' ? 'Black' : 'White'} wins!`);
//             setGameOverModalVisible(true);
//           } else if (chess.isDraw()) {
//             setGameOverMessage('The game is a draw!');
//             setGameOverModalVisible(true);
//           }
//         }
//       }
//       setSelectedSquare(null);
//     } else {
//       // Select a piece
//       const piece = chess.get(square);
//       if (piece && piece.color === chess.turn()) {
//         setSelectedSquare(square);
//       }
//     }
//   };

//   const handlePromotion = (promotionPiece) => {
//     if (promotionMove) {
//       chess.move({ from: promotionMove.from, to: promotionMove.to, promotion: promotionPiece });
//       setGameFEN(chess.fen());
//       setPromotionMove(null);
//       setPromotionModalVisible(false);
//       if (chess.isCheckmate()) {
//         setGameOverMessage(`${chess.turn() === 'w' ? 'Black' : 'White'} wins!`);
//         setGameOverModalVisible(true);
//       } else if (chess.isDraw()) {
//         setGameOverMessage('The game is a draw!');
//         setGameOverModalVisible(true);
//       }
//     }
//   };

//   const handleRematch = () => {
//     resetGame();
//     setGameOverModalVisible(false);
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.action}>
//       <TouchableOpacity style={styles.button} onPress={() => handleExit()}>
//         <Text style={styles.buttonText}>Exit</Text>
//       </TouchableOpacity>
//       <TouchableOpacity style={styles.button} onPress={() => resetGame()}>
//         <Text style={styles.buttonText}>Restart</Text>
//       </TouchableOpacity>
//       </View>
       
//      <View style={styles.board}></View>
//       <View style={styles.chessboardContainer}>
//         {board.map((row, rowIndex) => (
//           <View key={rowIndex} style={styles.row}>
//             {row.map((square, colIndex) => {
//               const squareName = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
//               return (
//                 <TouchableOpacity
//                   key={`${rowIndex}-${colIndex}`}
//                   style={[
//                     styles.square,
//                     (rowIndex + colIndex) % 2 === 0 ? styles.lightSquare : styles.darkSquare,
//                     selectedSquare === squareName ? styles.selectedSquare : null,
//                     validMoves.includes(squareName) ? styles.validMoveSquare : null,
//                     kingInCheck === squareName ? styles.kingInCheckSquare : null,
//                   ]}
//                   onPress={() => onSquarePress(rowIndex, colIndex)}
//                 >
//                   {square && square.type ? (
//                     <Image source={pieceImages[square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase()]} style={styles.pieceImage} />
//                   ) : null}
//                 </TouchableOpacity>
//               );
//             })}
//           </View>
//         ))}
//       </View>
     

//       <Modal
//         transparent={true}
//         animationType="slide"
//         visible={promotionModalVisible}
//         onRequestClose={() => setPromotionModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Choose a piece for promotion:</Text>
//             <View style={styles.promotionOptions}>
//               {['q', 'r', 'b', 'n'].map((piece) => (
//                 <TouchableOpacity key={piece} onPress={() => handlePromotion(piece)}>
//                   <Image source={pieceImages[piece]} style={styles.pieceImage} />
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>
//         </View>
//       </Modal>

//       <Modal
//         transparent={true}
//         animationType="slide"
//         visible={gameOverModalVisible}
//         onRequestClose={() => setGameOverModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>{gameOverMessage}</Text>
//             <TouchableOpacity style={styles.button} onPress={handleRematch}>
//               <Text style={styles.buttonText}>Rematch</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.button} onPress={handleExit}>
//               <Text style={styles.buttonText}>Exit</Text>
//             </TouchableOpacity>

//           </View>
//         </View>
//       </Modal>
//     </View>
//   );

//   function resetGame() {
//     chess.reset();
//     setGameFEN(chess.fen());
//     setSelectedSquare(null);
//   }
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,


//     backgroundColor: '#F0F0F0',
//   },
//   action:{
//     marginTop:20,
//     width:"1000px",
//   display:"flex",
//   alignItems:'flex-end',
//   marginBottom:20

  
   
//   },


//   title: {
   
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom:20,
   
//   },
//   chessboardContainer: {
//     borderWidth: 4,
//     borderColor: 'black',
//   },
//   row: {
//     flexDirection: 'row',
//   },
//   square: {
//     width: 50,
//     height: 50,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   lightSquare: {
//     backgroundColor: '#EEE',
//   },
//   darkSquare: {
//     backgroundColor: '#444',
//   },
//   selectedSquare: {
//     borderWidth: 2,
//     borderColor: '#FFD700',
//   },
//   validMoveSquare: {
//     backgroundColor: '#90EE90',
//   },
//   kingInCheckSquare: {
//     backgroundColor: '#FF6347',
//   },
//   pieceImage: {
//     width: 40,
//     height: 40,
//     resizeMode: 'contain',
//   },
//   button: {
//     width:100,
//     marginTop: 5,
//     margin:5,
//     padding: 3,
//     backgroundColor: 'red',
//     borderRadius: 5,

//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     textAlign:"center",
//   },
//   modalContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//   },
//   modalContent: {
//     width: 300,
//     padding: 20,
//     backgroundColor: 'white',
//   },
// }
// )


// // 

// // 

// import React, { useState } from 'react';
// import { StyleSheet, View, Text, TouchableOpacity, Image, Alert, Modal, ImageBackground } from 'react-native';
// import { Chess } from 'chess.js';
// import { useNavigation } from '@react-navigation/native';

// const pieceImages = {
//   'r': require('../assets/images/pieces/black-rook.png'),
//   'n': require('../assets/images/pieces/black-night.png'),
//   'b': require('../assets/images/pieces/black-bishop.png'),
//   'q': require('../assets/images/pieces/black-queen.png'),
//   'k': require('../assets/images/pieces/black-king.png'),
//   'p': require('../assets/images/pieces/black-pawn.png'),
//   'R': require('../assets/images/pieces/white-rook.png'),
//   'N': require('../assets/images/pieces/white-night.png'),
//   'B': require('../assets/images/pieces/white-bishop.png'),
//   'Q': require('../assets/images/pieces/white-queen.png'),
//   'K': require('../assets/images/pieces/white-king.png'),
//   'P': require('../assets/images/pieces/white-pawn.png'),
// };

// export default function ChessApp() {
//   const [chess] = useState(new Chess());
//   const [gameFEN, setGameFEN] = useState(chess.fen());
//   const [selectedSquare, setSelectedSquare] = useState(null);
//   const [promotionModalVisible, setPromotionModalVisible] = useState(false);
//   const [promotionMove, setPromotionMove] = useState(null);
//   const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
//   const [gameOverMessage, setGameOverMessage] = useState('');
//   const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });


//   const navigation = useNavigation();

//   const board = chess.board();
//   const validMoves = selectedSquare ? chess.moves({ square: selectedSquare, verbose: true }).map(move => move.to) : [];

//   // Find the king's position if it's in check
//   let kingInCheck = null;
//   if (chess.inCheck()) {
//     for (let rowIndex = 0; rowIndex < board.length; rowIndex++) {
//       for (let colIndex = 0; colIndex < board[rowIndex].length; colIndex++) {
//         const square = board[rowIndex][colIndex];
//         if (square && square.type === 'k' && square.color === chess.turn()) {
//           kingInCheck = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
//         }
//       }
//     }
//   }

//   const handleExit = () => {
//     resetGame();
//     navigation.navigate('index');
//     setGameOverModalVisible(false);
//   };

//   const onSquarePress = (rowIndex, colIndex) => {
//     const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
//     if (selectedSquare) {
//       // Try to move the piece
//       if (selectedSquare === square) {
//         // Deselect if the same square is clicked
//         setSelectedSquare(null);
//         return;
//       }
//       const move = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
//       if (move !== null) {
//         if (move.captured) {
//           // Add captured piece to the corresponding array
//           const newCapturedPieces = { ...capturedPieces };
//           newCapturedPieces[move.color === 'w' ? 'black' : 'white'].push(move.captured);
//           setCapturedPieces(newCapturedPieces);
//         }
//         if (move.flags.includes('p')) {
//           // If the move is a pawn promotion, show the promotion dialog
//           chess.undo(); // Undo the move to allow promotion selection
//           setPromotionMove({ from: selectedSquare, to: square });
//           setPromotionModalVisible(true);
//         } else {
//           setGameFEN(chess.fen());
//           if (chess.isCheckmate()) {
//             setGameOverMessage(`${chess.turn() === 'w' ? 'Black' : 'White'} wins!`);
//             setGameOverModalVisible(true);
//           } else if (chess.isDraw()) {
//             setGameOverMessage('The game is a draw!');
//             setGameOverModalVisible(true);
//           }
//         }
//       }
//       setSelectedSquare(null);
//     } else {
//       // Select a piece
//       const piece = chess.get(square);
//       if (piece && piece.color === chess.turn()) {
//         setSelectedSquare(square);
//       }
//     }
//   };

//   const handlePromotion = (promotionPiece) => {
//     if (promotionMove) {
//       const move = chess.move({ from: promotionMove.from, to: promotionMove.to, promotion: promotionPiece });
//       if (move.captured) {
//         // Add captured piece to the corresponding array
//         const newCapturedPieces = { ...capturedPieces };
//         newCapturedPieces[move.color === 'w' ? 'black' : 'white'].push(move.captured);
//         setCapturedPieces(newCapturedPieces);
//       }
//       setGameFEN(chess.fen());
//       setPromotionMove(null);
//       setPromotionModalVisible(false);
//       if (chess.isCheckmate()) {
//         setGameOverMessage(`${chess.turn() === 'w' ? 'Black' : 'White'} wins!`);
//         setGameOverModalVisible(true);
//       } else if (chess.isDraw()) {
//         setGameOverMessage('The game is a draw!');
//         setGameOverModalVisible(true);
//       }
//     }
//   };

//   const handleRematch = () => {
//     resetGame();
//     setGameOverModalVisible(false);
//   };

//   return (
//     <View style={styles.container}>
   
//       <View style={styles.action}>
//         <TouchableOpacity style={styles.button} onPress={() => handleExit()}>
//           <Text style={styles.buttonText}>Exit</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.button} onPress={() => resetGame()}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.capturedContainer}>
//         <View style={styles.user}>

// <Image source={require('../assets/images/pieces/black-rook.png')} style={styles.userImg} />

//         </View>
  
//         <View style={styles.capturedPieces}>
//           {capturedPieces.white.map((piece, index) => (
//             <Image key={index} source={pieceImages[piece.toUpperCase()]} style={styles.capturedPieceImage} />
//           ))}
//         </View>
//       </View>

      

//       <View style={styles.chessboardContainer}>
      

//         {board.map((row, rowIndex) => (
//           <View key={rowIndex} style={styles.row}>
//             {row.map((square, colIndex) => {
//               const squareName = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
//               return (
//                 <TouchableOpacity
//                   key={`${rowIndex}-${colIndex}`}
//                   style={[
//                     styles.square,
//                     (rowIndex + colIndex) % 2 === 0 ? styles.lightSquare : styles.darkSquare,
//                     selectedSquare === squareName ? styles.selectedSquare : null,
//                     validMoves.includes(squareName) ? styles.validMoveSquare : null,
//                     kingInCheck === squareName ? styles.kingInCheckSquare : null,
//                   ]}
//                   onPress={() => onSquarePress(rowIndex, colIndex)}
//                 >
//                   {square && square.type ? (
//                     <Image source={pieceImages[square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase()]} style={styles.pieceImage} />
//                   ) : null}
//                 </TouchableOpacity>
//               );
//             })}
//           </View>
//         ))}
//       </View>

//       <View style={styles.capturedContainer}>
        
//         <View style={styles.capturedPieces}>
//           {capturedPieces.black.map((piece, index) => (
//             <Image key={index} source={pieceImages[piece]} style={styles.capturedPieceImage} />
//           ))}
//         </View>
//         <View style={styles.user}>

// <Image source={require('../assets/images/pieces/black-rook.png')} style={styles.userImg} />

//         </View>
//       </View>
      

//       <Modal
//         transparent={true}
//         animationType="slide"
//         visible={promotionModalVisible}
//         onRequestClose={() => setPromotionModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Choose a piece for promotion:</Text>
//             <View style={styles.promotionOptions}>
//               {['q', 'r', 'b', 'n'].map((piece) => (
//                 <TouchableOpacity key={piece} onPress={() => handlePromotion(piece)}>
//                   <Image source={pieceImages[piece]} style={styles.pieceImage} />
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>
//         </View>
//       </Modal>

//       <Modal
//         transparent={true}
//         animationType="slide"
//         visible={gameOverModalVisible}
//         onRequestClose={() => setGameOverModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>{gameOverMessage}</Text>
//             <TouchableOpacity style={styles.button} onPress={handleRematch}>
//               <Text style={styles.buttonText}>Rematch</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.button} onPress={handleExit}>
//               <Text style={styles.buttonText}>Exit</Text>
//             </TouchableOpacity>

//           </View>
//         </View>
//       </Modal>
//     </View>
//   );


//   function resetGame() {
//     chess.reset();
//     setGameFEN(chess.fen());
//     setSelectedSquare(null);
//     setCapturedPieces({ white: [], black: [] });
//   }
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F0F0F0',
//   },
//   action: {
//     marginTop: 20,
//     width: '100%',
//     display: 'flex',
//     alignItems: 'flex-end',
//     marginBottom: 20,
//   },
//   chessboardContainer: {
//     borderWidth: 4,
//     borderColor: 'black',
//   },
//   row: {
//     flexDirection: 'row',
//   },
//   user: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 10,
//   },
//   userImg: {
//     height: 50,
//     width: 50,
//     borderWidth: 2,
//     borderColor: 'white',
//     borderRadius: 25,
//     resizeMode: 'cover',
//   },
//   square: {
//     width: 50,
//     height: 50,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   lightSquare: {
//     backgroundColor: '#EEE',
//   },
//   darkSquare: {
//     backgroundColor: '#444',
//   },
//   selectedSquare: {
//     borderWidth: 2,
//     borderColor: '#FFD700',
//   },
//   validMoveSquare: {
//     backgroundColor: '#90EE90',
//   },
//   kingInCheckSquare: {
//     backgroundColor: '#FF6347',
//   },
//   pieceImage: {
//     width: 50,
//     height: 50,
//     resizeMode: 'contain',
//   },
//   button: {
//     width: 100,
//     marginTop: 5,
//     margin: 5,
//     padding: 3,
//     backgroundColor: 'red',
//     borderRadius: 5,
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   capturedContainer: {
//     width: '100%',
//     height: 100,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: 'brown',
//     paddingHorizontal: 10,
//   },
//   capturedPieces: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     flexWrap: 'wrap',
//     maxWidth: '60%',
//   },
//   capturedPieceImage: {
//     width: 30,
//     height: 30,
//     resizeMode: 'contain',
//     marginHorizontal: 5,
//   },
//   // Common styles for all modals
//   modalContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0, 0, 0, 0.5)', // Translucent black background for better focus on modal content
//   },
//   modalContent: {
//     width: 300,
//     padding: 20,
//     backgroundColor: 'white',
//     borderRadius: 10,
//     elevation: 5, // Adds shadow for Android
//     shadowColor: '#000', // Adds shadow for iOS
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.8,
//     shadowRadius: 2,
//     alignItems: 'center', // Center-align content
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     textAlign: 'center',
//   },
//   promotionOptions: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginTop: 10,
//   },
// });
