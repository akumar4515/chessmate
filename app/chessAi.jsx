import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal, Dimensions, ScrollView, BackHandler, SafeAreaView, StatusBar } from 'react-native';
import { Chess } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ClickSoundContext } from './clickSound';

const { width, height } = Dimensions.get('window');

// Enhanced responsive calculations
const isTablet = width > 768;
const isSmallScreen = height < 700;
const isLargeScreen = height > 800;
const isVerySmallScreen = height < 600;
const isVeryLargeScreen = height > 900;

// Calculate available height for the board
const statusBarHeight = 0; // Since we're hiding status bar
const headerHeight = 70;
const playerSectionHeight = 120; // Both player sections
const controlPanelHeight = 60;
const bottomPadding = 20;
const availableHeight = height - statusBarHeight - headerHeight - playerSectionHeight - controlPanelHeight - bottomPadding;

// Calculate optimal square size based on available space
const maxBoardWidth = width - 40; // 20px padding on each side
const maxBoardHeight = availableHeight - 20; // 10px padding top and bottom
const maxSquareSize = Math.min(maxBoardWidth / 8, maxBoardHeight / 8);
const squareSize = Math.max(30, Math.min(maxSquareSize, 60)); // Min 30px, max 60px

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

// Piece images for the board and captured pieces (UNCHANGED)
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

export default function ChessAiApp() {
  const [chess] = useState(new Chess());
  const clickSoundContext = React.useContext(ClickSoundContext);
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
  const [showAiCaptured, setShowAiCaptured] = useState(false);
  const [showHumanCaptured, setShowHumanCaptured] = useState(false);

  const router = useRouter();
  const { mode, level: routeLevel } = useLocalSearchParams();
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

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

  useEffect(() => {
    if (chess.inCheck()) {
      const kingPosition = findKingPosition();
      setKingInCheck(kingPosition);
      playSound(checkSound);
    } else {
      setKingInCheck(null);
    }
  }, [gameFEN]);

  // Get level from route params
  useEffect(() => {
    if (routeLevel) {
      setLevel(routeLevel);
    }
  }, [routeLevel]);

  // Start timer for current player
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (isPlay && !gameOverModalVisible && !exitModalVisible && !promotionModalVisible && mode !== 'unlimited' && !chess.isGameOver() && isMountedRef.current) {
      timerRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return;
        }
        
        // Use chess.turn() to get the actual current turn, not the state
        const actualTurn = chess.turn();
        
        if (actualTurn === 'w') {
          setWhiteTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              if (isMountedRef.current) {
                setGameOverMessage('AI wins! You ran out of time.');
                setGameOverModalVisible(true);
              }
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              if (isMountedRef.current) {
                setGameOverMessage('You win! AI ran out of time.');
                setGameOverModalVisible(true);
              }
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
  };

  // Start timer when turn changes
  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Start new timer
    startTimer();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentTurn, gameOverModalVisible, exitModalVisible, promotionModalVisible, isPlay, mode, chess]);

  // AI move effect - separate from timer
  useEffect(() => {
    if (currentTurn === 'b' && !gameOverModalVisible && isPlay) {
      setTimeout(() => {
        aiMove(level);
      }, 1500);
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
      
      try {
        if (level === 'easy') {
          // Easy: Random moves with slight preference for captures
          bestMove = getEasyMove(moves);
        } else if (level === 'medium') {
          // Medium: 1-ply lookahead with basic evaluation
          bestMove = getMediumMove(moves);
        } else if (level === 'hard') {
          // Hard: Smart move selection with chess principles
          bestMove = getHardMove(moves);
        }
      } catch (error) {
        console.warn('AI error, falling back to random move:', error);
        bestMove = getEasyMove(moves);
      }

      // Safety check - ensure we have a valid move
      if (!bestMove) {
        console.warn('AI could not find a valid move, using first available move');
        bestMove = moves[0];
      }

      const moveResult = chess.move(bestMove);
      if (moveResult) {
        console.log('AI Move made:', bestMove);
        console.log('AI Move result:', moveResult);
        setGameFEN(chess.fen());
        setCurrentTurn(chess.turn());
        const newCapturedPieces = calculateCapturedPieces();
        console.log('AI New captured pieces:', newCapturedPieces);
        setCapturedPieces(newCapturedPieces);
        
        if (moveResult.captured) {
          console.log('AI captured piece:', moveResult.captured);
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

  // Piece values for evaluation
  const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  
  // Position values for better piece placement
  const PAWN_POSITION_VALUES = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ];

  const KNIGHT_POSITION_VALUES = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ];

  const BISHOP_POSITION_VALUES = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ];

  const ROOK_POSITION_VALUES = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ];

  const QUEEN_POSITION_VALUES = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ];

  const KING_POSITION_VALUES = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ];

  // Easy AI: Random moves with slight preference for captures
  const getEasyMove = (moves) => {
    const captures = moves.filter(move => move.captured);
    if (captures.length > 0 && Math.random() < 0.7) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  };

  // Medium AI: 1-ply lookahead with randomization
  const getMediumMove = (moves) => {
    if (moves.length === 0) return null;
    
    const scoredMoves = moves.map(move => {
      chess.move(move);
      const score = evaluateBoard(chess);
      chess.undo();
      return { move, score };
    });

    // Sort by score (best first)
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Add some randomization - choose from top 3-5 moves
    const topMoves = Math.min(5, Math.max(3, Math.floor(moves.length * 0.3)));
    const randomIndex = Math.floor(Math.random() * topMoves);
    
    // Safety check
    if (scoredMoves[randomIndex] && scoredMoves[randomIndex].move) {
      return scoredMoves[randomIndex].move;
    }
    
    // Fallback to first move if something goes wrong
    return scoredMoves[0] ? scoredMoves[0].move : moves[0];
  };

  // Hard AI: Smart move selection without minimax
  const getHardMove = (moves) => {
    if (moves.length === 0) return null;
    
    // Prioritize moves by importance
    const prioritizedMoves = moves.map(move => {
      let score = 0;
      
      // Capture moves get high priority
      if (move.captured) {
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
        score += pieceValues[move.captured.toLowerCase()] * 100;
      }
      
      // Check moves get priority
      if (move.flags.includes('+')) {
        score += 50;
      }
      
      // Center control
      const centerSquares = ['d4', 'd5', 'e4', 'e5'];
      if (centerSquares.includes(move.to)) {
        score += 30;
      }
      
      // Development moves (moving pieces from starting positions)
      if (move.piece === 'p' && (move.from.includes('7') || move.from.includes('2'))) {
        score += 20;
      }
      
      // Castling
      if (move.flags.includes('k') || move.flags.includes('q')) {
        score += 40;
      }
      
      // Pawn advancement
      if (move.piece === 'p') {
        const fromRank = parseInt(move.from[1]);
        const toRank = parseInt(move.to[1]);
        const advancement = Math.abs(toRank - fromRank);
        score += advancement * 10;
      }
      
      // Piece activity (moving to more active squares)
      const pieceActivity = getPieceActivity(move.to);
      score += pieceActivity;
      
      return { move, score };
    });

    // Sort by score (best first)
    prioritizedMoves.sort((a, b) => b.score - a.score);
    
    // Choose from top 3-5 moves for variety
    const topMoves = Math.min(5, Math.max(3, Math.floor(prioritizedMoves.length * 0.4)));
    const randomIndex = Math.floor(Math.random() * topMoves);
    
    return prioritizedMoves[randomIndex].move;
  };

  // Helper function to calculate piece activity
  const getPieceActivity = (square) => {
    const [file, rank] = [square.charCodeAt(0) - 97, parseInt(square[1])];
    let activity = 0;
    
    // Prefer central squares
    if (file >= 3 && file <= 4 && rank >= 3 && rank <= 6) {
      activity += 20;
    }
    
    // Prefer squares that attack enemy territory
    if (rank >= 4) {
      activity += 10;
    }
    
    return activity;
  };

  // Optimized minimax algorithm with alpha-beta pruning
  const minimax = (game, depth, alpha, beta, maximizingPlayer) => {
    if (depth === 0 || game.isGameOver()) {
      return { move: null, evaluation: evaluateBoard(game) };
    }

    const moves = game.moves({ verbose: true });
    
    // Limit moves for performance (max 15 moves per level)
    const limitedMoves = moves.slice(0, 15);
    
    let bestMove = limitedMoves[0];
    let bestEvaluation = maximizingPlayer ? -Infinity : Infinity;

    for (const move of limitedMoves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, !maximizingPlayer).evaluation;
      game.undo();

      if (maximizingPlayer) {
        if (evaluation > bestEvaluation) {
          bestEvaluation = evaluation;
          bestMove = move;
        }
        alpha = Math.max(alpha, evaluation);
      } else {
        if (evaluation < bestEvaluation) {
          bestEvaluation = evaluation;
          bestMove = move;
        }
        beta = Math.min(beta, evaluation);
      }

      // Alpha-beta pruning
      if (beta <= alpha) {
        break;
      }
    }

    return { move: bestMove, evaluation: bestEvaluation };
  };

  // Add some randomness to evaluation to create variety
  const addEvaluationRandomness = (evaluation) => {
    // Add small random factor to break ties and create variety
    const randomFactor = (Math.random() - 0.5) * 20; // ±10 points
    return evaluation + randomFactor;
  };

  // Enhanced board evaluation with position values
  const evaluateBoard = (chess) => {
    const board = chess.board();
    let evaluation = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = board[row][col];
        if (square) {
          const pieceValue = PIECE_VALUES[square.type.toLowerCase()];
          let positionValue = 0;

          // Get position value based on piece type
          if (square.type.toLowerCase() === 'p') {
            positionValue = square.color === 'w' ? PAWN_POSITION_VALUES[row][col] : PAWN_POSITION_VALUES[7-row][col];
          } else if (square.type.toLowerCase() === 'n') {
            positionValue = square.color === 'w' ? KNIGHT_POSITION_VALUES[row][col] : KNIGHT_POSITION_VALUES[7-row][col];
          } else if (square.type.toLowerCase() === 'b') {
            positionValue = square.color === 'w' ? BISHOP_POSITION_VALUES[row][col] : BISHOP_POSITION_VALUES[7-row][col];
          } else if (square.type.toLowerCase() === 'r') {
            positionValue = square.color === 'w' ? ROOK_POSITION_VALUES[row][col] : ROOK_POSITION_VALUES[7-row][col];
          } else if (square.type.toLowerCase() === 'q') {
            positionValue = square.color === 'w' ? QUEEN_POSITION_VALUES[row][col] : QUEEN_POSITION_VALUES[7-row][col];
          } else if (square.type.toLowerCase() === 'k') {
            positionValue = square.color === 'w' ? KING_POSITION_VALUES[row][col] : KING_POSITION_VALUES[7-row][col];
          }

          const totalValue = pieceValue * 100 + positionValue;
          evaluation += square.color === 'w' ? totalValue : -totalValue;
        }
      }
    }

    // Add mobility bonus
    const currentTurn = chess.turn();
    const currentMoves = chess.moves({ verbose: true }).length;
    
    // Create a temporary chess instance to count opponent moves
    const tempChess = new Chess(chess.fen());
    tempChess.turn = tempChess.turn() === 'w' ? 'b' : 'w';
    const opponentMoves = tempChess.moves({ verbose: true }).length;
    
    evaluation += (currentTurn === 'w' ? currentMoves - opponentMoves : opponentMoves - currentMoves) * 10;

    // Add center control bonus
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    centerSquares.forEach(square => {
      const piece = chess.get(square);
      if (piece) {
        const bonus = piece.color === 'w' ? 20 : -20;
        evaluation += bonus;
      }
    });

    // Add some randomness for variety
    return addEvaluationRandomness(evaluation);
  };

  const calculateCapturedPieces = () => {
    const currentPieces = { white: [], black: [] };
    const board = chess.board();

    // Count current pieces on the board
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

    // Calculate captured pieces by comparing with initial pieces
    const capturedWhite = [];
    const capturedBlack = [];

    // Count initial pieces
    const initialWhiteCount = { 'P': 8, 'R': 2, 'N': 2, 'B': 2, 'Q': 1, 'K': 1 };
    const initialBlackCount = { 'p': 8, 'r': 2, 'n': 2, 'b': 2, 'q': 1, 'k': 1 };

    // Count current pieces
    const currentWhiteCount = {};
    const currentBlackCount = {};
    
    currentPieces.white.forEach(piece => {
      currentWhiteCount[piece] = (currentWhiteCount[piece] || 0) + 1;
    });
    
    currentPieces.black.forEach(piece => {
      currentBlackCount[piece] = (currentBlackCount[piece] || 0) + 1;
    });

    // Calculate captured pieces
    Object.keys(initialWhiteCount).forEach(piece => {
      const initialCount = initialWhiteCount[piece];
      const currentCount = currentWhiteCount[piece] || 0;
      const capturedCount = initialCount - currentCount;
      for (let i = 0; i < capturedCount; i++) {
        capturedWhite.push(piece);
      }
    });

    Object.keys(initialBlackCount).forEach(piece => {
      const initialCount = initialBlackCount[piece];
      const currentCount = currentBlackCount[piece] || 0;
      const capturedCount = initialCount - currentCount;
      for (let i = 0; i < capturedCount; i++) {
        capturedBlack.push(piece);
      }
    });

    console.log('AI Captured pieces calculation:');
    console.log('Current white pieces on board:', currentPieces.white);
    console.log('Current black pieces on board:', currentPieces.black);
    console.log('Missing white pieces (captured by black):', capturedWhite);
    console.log('Missing black pieces (captured by white):', capturedBlack);
    console.log('Final result - White player captured:', capturedBlack);
    console.log('Final result - Black player (AI) captured:', capturedWhite);
    console.log('Piece images available:', Object.keys(pieceImages));

    return {
      white: capturedBlack, // White player captured black pieces (show black piece images)
      black: capturedWhite, // Black player (AI) captured white pieces (show white piece images)
    };
  };

  const handleExit = () => {
    setExitModalVisible(true);
  };

  const handleConfirmExit = () => {
    // Mark component as unmounted to prevent timer from running
    isMountedRef.current = false;
    // Clear timer before exiting
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    resetGame();
    router.push('/');
    setExitModalVisible(false);
    setGameOverModalVisible(false);
  };

  const handleCancelModal = () => {
    setExitModalVisible(false);
  };

  useEffect(() => {
    const backAction = () => {
      // Always prevent back navigation during game
      if (!exitModalVisible && !gameOverModalVisible) {
        // Show exit confirmation modal when back button is pressed
        setExitModalVisible(true);
      }
      return true; // Always prevent default back behavior
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [exitModalVisible, gameOverModalVisible]);


  const onSquarePress = (rowIndex, colIndex) => {
    if (!isPlay || currentTurn !== 'w') return;

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
          console.log('Human Move made:', { from: selectedSquare, to: square });
          console.log('Human Move result:', moveResult);
          setGameFEN(chess.fen());
          setCurrentTurn(chess.turn());
          const newCapturedPieces = calculateCapturedPieces();
          console.log('Human New captured pieces:', newCapturedPieces);
          setCapturedPieces(newCapturedPieces);

          if (moveResult.captured) {
            console.log('Human captured piece:', moveResult.captured);
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
          setSelectedSquare(null);
        }
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
      chess.undo();
      chess.undo();
    } else if (historyLength === 1) {
      chess.undo();
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
    setGameOverModalVisible(false);
    setGameOverMessage('');
    setShowAiCaptured(false);
    setShowHumanCaptured(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateTimersAfterMove = () => {
    if (mode === 'classic') {
      // Reset both timers to 60 seconds after each move
      setWhiteTimer(60);
      setBlackTimer(60);
    } else if (mode === 'rush') {
      // Reset both timers to 20 seconds after each move
      setWhiteTimer(20);
      setBlackTimer(20);
    } else if (mode === 'blitz') {
      // Add 2 seconds to the timer of the player who just moved (max 30)
      if (currentTurn === 'w') {
        // White just moved, add time to white's timer (the player who moved)
        setWhiteTimer(prev => Math.min(prev + 2, 30));
      } else {
        // Black just moved, add time to black's timer (the player who moved)
        setBlackTimer(prev => Math.min(prev + 2, 30));
      }
    }
    // For unlimited mode, no timer updates needed
  };

  const checkGameOver = () => {
    if (chess.isCheckmate()) {
      setGameOverMessage(`${chess.turn() === 'w' ? 'AI' : 'You'} wins by checkmate!`);
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
    setPauseName(newIsPlay ? "Pause" : "Resume");
    setSelectedSquare(null);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleShowMoves = () => setShowMoves(prev => !prev);
  const toggleBoardOrientation = () => setIsBoardFlipped(!isBoardFlipped);
  const handleColorChange = (light, dark) => setSelectedColor({ light, dark });

  const renderBoard = isBoardFlipped ? board.slice().reverse() : board;

  const formatTime = (seconds) => {
    if (mode === 'unlimited') return '∞';
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" hidden translucent />
      
      {/* Responsive Header */}
      <View style={[styles.headerContainer, { height: getResponsiveSpacing(70) }]}>
        <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(),handleExit()}} style={[styles.headerButton, { width: getResponsiveSpacing(40), height: getResponsiveSpacing(40) }]}>
          <Ionicons name="arrow-back" size={getResponsiveFontSize(24)} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.gameMode, { fontSize: getResponsiveFontSize(18) }]}>{(mode || 'classic').toUpperCase()}</Text>
          <Text style={[styles.gameModeSubtext, { fontSize: getResponsiveFontSize(12) }]}>vs AI ({level || 'medium'})</Text>
        </View>

        <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(),toggleSidebar()}} style={[styles.headerButton, { width: getResponsiveSpacing(40), height: getResponsiveSpacing(40) }]}>
          <Ionicons name="settings" size={getResponsiveFontSize(24)} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Player Section - AI */}
      <View style={[styles.playerSection, { paddingVertical: getResponsiveSpacing(8) }]}>
        <TouchableOpacity 
          style={[styles.playerCard, { padding: getResponsiveSpacing(12) }]}
          onPress={() => {clickSoundContext?.playClick?.(), setShowAiCaptured(!showAiCaptured)}}
        >
          {!showAiCaptured ? (
            <>
              <View style={styles.playerInfo}>
                <View style={[styles.playerAvatar, { width: getResponsiveSpacing(36), height: getResponsiveSpacing(36) }]}>
                  <Ionicons name="hardware-chip" size={getResponsiveFontSize(20)} color="#FFFFFF" />
                </View>
                <View style={styles.playerDetails}>
                  <Text style={[styles.playerName, { fontSize: getResponsiveFontSize(16) }]}>AI</Text>
                  <Text style={[styles.statusText, { fontSize: getResponsiveFontSize(12) }]}>
                    {(currentTurn || 'w') === 'b' ? 'Thinking...' : 'Waiting'}
                  </Text>
                </View>
              </View>
              {(mode || 'classic') !== 'unlimited' && (
                <View style={[styles.timerContainer, { paddingHorizontal: getResponsiveSpacing(12), paddingVertical: getResponsiveSpacing(6) }]}>
                  <Text style={[styles.timerText, blackTimer <= 10 ? styles.urgentTimer : null, { fontSize: getResponsiveFontSize(14) }]}>
                    {formatTime(blackTimer || 0)}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.capturedPiecesContainer}>
              <View style={styles.capturedHeader}>
                <Text style={[styles.capturedLabel, { fontSize: getResponsiveFontSize(12) }]}>Captured by AI</Text>
                {(mode || 'classic') !== 'unlimited' && (
                  <View style={[styles.timerContainer, { paddingHorizontal: getResponsiveSpacing(8), paddingVertical: getResponsiveSpacing(4) }]}>
                    <Text style={[styles.timerText, blackTimer <= 10 ? styles.urgentTimer : null, { fontSize: getResponsiveFontSize(12) }]}>
                      {formatTime(blackTimer || 0)}
                    </Text>
                  </View>
                )}
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.capturedScrollView}
                contentContainerStyle={styles.capturedScrollContent}
              >
                {capturedPieces.black.map((piece, index) => {
                  console.log(`Rendering AI captured piece ${index}:`, piece, 'Image source:', pieceImages[piece]);
                  return (
                    <Image
                      key={index}
                      source={pieceImages[piece]}
                      style={[styles.capturedPieceImage, { 
                        width: Math.max(20, squareSize * 0.4), 
                        height: Math.max(20, squareSize * 0.4) 
                      }]}
                    />
                  );
                })}
                {capturedPieces.black.length === 0 && (
                  <Text style={[styles.noCapturedText, { fontSize: getResponsiveFontSize(10) }]}>None</Text>
                )}
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>

      </View>

      {/* Chess Board - Responsive */}
      <View style={[styles.boardSection, { flex: 1, minHeight: squareSize * 8 + 20 }]}>
        <View style={[styles.chessboardContainer, { 
          width: squareSize * 8 + 12, 
          height: squareSize * 8 + 12,
          padding: 6 
        }]}>
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
                        width: squareSize,
                        height: squareSize,
                        backgroundColor: (adjustedRow + adjustedCol) % 2 === 0 
                          ? selectedColor.light 
                          : selectedColor.dark
                      },
                      isSelected && styles.selectedSquare,
                      isValidMove && styles.validMoveSquare,
                      isKingInCheck && styles.kingInCheckSquare,
                    ]}
                    onPress={() => onSquarePress(adjustedRow, colIndex)}
                  >
                    {showMoves && isValidMove && !square && (
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

      {/* Player Section - Human */}
      <View style={[styles.playerSection, { paddingVertical: getResponsiveSpacing(8) }]}>
        {/* Captured Pieces - Bottom */}
        

        <TouchableOpacity 
          style={[styles.playerCard, { padding: getResponsiveSpacing(12) }]}
          onPress={() => {clickSoundContext?.playClick?.(), setShowHumanCaptured(!showHumanCaptured)}}
        >
          {!showHumanCaptured ? (
            <>
              <View style={styles.playerInfo}>
                <View style={[styles.playerAvatar, { width: getResponsiveSpacing(36), height: getResponsiveSpacing(36) }]}>
                  <Ionicons name="person" size={getResponsiveFontSize(20)} color="#FFFFFF" />
                </View>
                <View style={styles.playerDetails}>
                  <Text style={[styles.playerName, { fontSize: getResponsiveFontSize(16) }]}>You</Text>
                  <Text style={[styles.statusText, { fontSize: getResponsiveFontSize(12) }]}>
                    {(currentTurn || 'w') === 'w' ? 'Your Turn' : 'Waiting'}
                  </Text>
                </View>
              </View>
              {(mode || 'classic') !== 'unlimited' && (
                <View style={[styles.timerContainer, { paddingHorizontal: getResponsiveSpacing(12), paddingVertical: getResponsiveSpacing(6) }]}>
                  <Text style={[styles.timerText, whiteTimer <= 10 ? styles.urgentTimer : null, { fontSize: getResponsiveFontSize(14) }]}>
                    {formatTime(whiteTimer || 0)}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.capturedPiecesContainer}>
              <View style={styles.capturedHeader}>
                <Text style={[styles.capturedLabel, { fontSize: getResponsiveFontSize(12) }]}>Captured by You</Text>
                {(mode || 'classic') !== 'unlimited' && (
                  <View style={[styles.timerContainer, { paddingHorizontal: getResponsiveSpacing(8), paddingVertical: getResponsiveSpacing(4) }]}>
                    <Text style={[styles.timerText, whiteTimer <= 10 ? styles.urgentTimer : null, { fontSize: getResponsiveFontSize(12) }]}>
                      {formatTime(whiteTimer || 0)}
                    </Text>
                  </View>
                )}
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.capturedScrollView}
                contentContainerStyle={styles.capturedScrollContent}
              >
                {capturedPieces.white.map((piece, index) => {
                  console.log(`Rendering Human captured piece ${index}:`, piece, 'Image source:', pieceImages[piece]);
                  return (
                    <Image
                      key={index}
                      source={pieceImages[piece]}
                      style={[styles.capturedPieceImage, { 
                        width: Math.max(20, squareSize * 0.4), 
                        height: Math.max(20, squareSize * 0.4) 
                      }]}
                    />
                  );
                })}
                {capturedPieces.white.length === 0 && (
                  <Text style={[styles.noCapturedText, { fontSize: getResponsiveFontSize(10) }]}>None</Text>
                )}
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Control Panel */}
      <View style={[styles.controlPanel, { paddingVertical: getResponsiveSpacing(10) }]}>
        <TouchableOpacity style={[styles.undoButton, { paddingHorizontal: getResponsiveSpacing(16), paddingVertical: getResponsiveSpacing(10) }]} onPress={() =>{clickSoundContext?.playClick?.(),handleUndo()}}>
          <Ionicons name="arrow-undo" size={getResponsiveFontSize(18)} color="#FFFFFF" />
          <Text style={[styles.undoButtonText, { fontSize: getResponsiveFontSize(14) }]}>Undo</Text>
        </TouchableOpacity>
      </View>

      {/* Minimalistic Sidebar */}
      {isSidebarOpen && (
        <>
          <TouchableOpacity style={styles.overlay} onPress={() =>{clickSoundContext?.playClick?.(),toggleSidebar()}} />
          <View style={styles.sidebar}>
            <TouchableOpacity style={styles.closeButton} onPress={() =>{clickSoundContext?.playClick?.(),toggleSidebar()}}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.sidebarTitle}>Settings</Text>

            {/* AI Level Display - Read Only */}
            <View style={styles.levelSection}>
              <Text style={styles.sectionTitle}>AI Difficulty</Text>
              <View style={styles.levelDisplayContainer}>
                <Ionicons name="hardware-chip" size={18} color="#4ECDC4" />
                <Text style={styles.levelDisplayText}>
                  {(level || 'medium').charAt(0).toUpperCase() + (level || 'medium').slice(1)}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.sidebarButton} onPress={() =>{clickSoundContext?.playClick?.(),handlePauseResume()}}>
              <Ionicons name={isPlay ? "pause" : "play"} size={18} color="#FFFFFF" />
              <Text style={styles.sidebarButtonText}>{pauseName}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarButton} onPress={() =>{clickSoundContext?.playClick?.(),toggleBoardOrientation()}}>
              <Ionicons name="swap-vertical" size={18} color="#FFFFFF" />
              <Text style={styles.sidebarButtonText}>Flip Board</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarButton} onPress={() =>{clickSoundContext?.playClick?.(),resetGame()}}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.sidebarButtonText}>Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarButton} onPress={() =>{clickSoundContext?.playClick?.(),handleExit()}}>
              <Ionicons name="exit" size={18} color="#FFFFFF" />
              <Text style={styles.sidebarButtonText}>Exit</Text>
            </TouchableOpacity>

            <View style={styles.toggleSection}>
              <Text style={styles.sectionTitle}>Options</Text>
              
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Show Moves</Text>
                <TouchableOpacity
                  style={[styles.toggleSwitch, showMoves ? styles.toggleSwitchOn : styles.toggleSwitchOff]}
                  onPress={() =>{clickSoundContext?.playClick?.(),toggleShowMoves()}}
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
                  onPress={() =>{clickSoundContext?.playClick?.(), handleColorChange('#EDEDED','#8B5A5A')}} 
                />
                <TouchableOpacity 
                  style={styles.colorOption2} 
                  onPress={() =>{clickSoundContext?.playClick?.(), handleColorChange('#D3D3D3', '#A9A9A9')}} 
                />
                <TouchableOpacity 
                  style={styles.colorOption3} 
                  onPress={() =>{clickSoundContext?.playClick?.(), handleColorChange('#FAF0E6', '#5F9EA0')} }
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

      {/* Minimalistic Modals */}
      <Modal
        visible={promotionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>{clickSoundContext?.playClick?.(), setPromotionModalVisible(false)}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Promotion</Text>
            <View style={styles.promotionOptions}>
              {['q', 'r', 'b', 'n'].map(piece => (
                <TouchableOpacity
                  key={piece}
                  onPress={() =>{clickSoundContext?.playClick?.(), handlePromotion(piece)}}
                  style={styles.promotionOption}
                >
                  <Image source={pieceImages[piece]} style={styles.promotionPiece} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={gameOverModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // Don't close modal on back button, let user choose
          return;
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="trophy" size={40} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Game Over</Text>
            <Text style={styles.gameOverMessage}>{gameOverMessage || 'Game Over'}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() =>{clickSoundContext?.playClick?.(),handleRematch()}}>
                <Text style={styles.modalButtonText}>Rematch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={() =>{clickSoundContext?.playClick?.(),handleConfirmExit()}}>
                <Text style={styles.modalButtonText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={exitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>{clickSoundContext?.playClick?.(), setExitModalVisible(false)}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={40} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Leave Game?</Text>
            <Text style={styles.exitMessage}>Are you sure you want to leave?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() =>{clickSoundContext?.playClick?.(),handleConfirmExit()}}>
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={() =>{clickSoundContext?.playClick?.(),handleCancelModal()}}>
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
  capturedPiecesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  capturedLabel: {
    color: '#AAAAAA',
    fontSize: 10,
    textAlign: 'center',
    flex: 1,
  },
  capturedScrollView: {
    maxHeight: 30,
  },
  capturedScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  capturedPieceImage: {
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
  levelSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  levelDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
  },
  levelDisplayText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
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