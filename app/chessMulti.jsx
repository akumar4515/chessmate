import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  StatusBar,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');

// FIXED: Make board responsive and fill available space
const BOARD_SIZE = Math.min(width * 0.9, height * 0.45); 
const SQUARE_SIZE = BOARD_SIZE / 8;

export default function ChessMultiRedesigned() {
  const [user, setUser] = useState(null);
  const [friend, setFriend] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [userTime, setUserTime] = useState(0);
  const [friendTime, setFriendTime] = useState(0);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameOverModal, setGameOverModal] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [moves, setMoves] = useState([]);
  const [showMoves, setShowMoves] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // FIXED: Add state to track player colors
  const [userColor, setUserColor] = useState(null); // 'white' or 'black'
  const [whitePlayerId, setWhitePlayerId] = useState(null);
  const [blackPlayerId, setBlackPlayerId] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const route = useRoute();
  const navigation = useNavigation();
  const { mode, initialTime, uid, friendId, gameId, whitePlayerId: routeWhitePlayerId, blackPlayerId: routeBlackPlayerId } = route.params;

  // FIXED: Match your current API URL
  const API_URL = 'http://192.168.243.45:3000';
  
  const socketRef = useRef(null);
  const userTimerRef = useRef(null);
  const friendTimerRef = useRef(null);

  // Enhanced initial board setup
  const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  ];

  // Chess piece images mapping
  const pieceImages = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
  };

  useEffect(() => {
    initializeAnimations();
    initialize();
    return cleanup;
  }, []);

  const initializeAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const initialize = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch user and friend data
      const [userResponse, friendResponse] = await Promise.all([
        axios.get(`${API_URL}/api/users/${uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/users/${friendId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setUser(userResponse.data);
      setFriend(friendResponse.data);

      // FIXED: Determine player colors from route params
      if (routeWhitePlayerId && routeBlackPlayerId) {
        setWhitePlayerId(routeWhitePlayerId);
        setBlackPlayerId(routeBlackPlayerId);
        setUserColor(routeWhitePlayerId === uid ? 'white' : 'black');
        
        console.log('Player colors set:', {
          uid,
          userColor: routeWhitePlayerId === uid ? 'white' : 'black',
          whitePlayerId: routeWhitePlayerId,
          blackPlayerId: routeBlackPlayerId
        });
      } else {
        // Default: user who navigated here first is white
        setWhitePlayerId(uid);
        setBlackPlayerId(friendId);
        setUserColor('white');
      }

      // Initialize game state
      setGameState({
        board: initialBoard,
        gameId: gameId || `game_${Date.now()}`,
        turn: 'white',
        status: 'ongoing',
      });

      setUserTime(initialTime);
      setFriendTime(initialTime);

      // Initialize Socket.IO
      await initializeSocket(token);
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err.response?.data?.message || 'Failed to start game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = async (token) => {
    return new Promise((resolve, reject) => {
      socketRef.current = io(API_URL, {
        auth: { token },
        query: { gameId: gameState?.gameId || gameId },
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to Socket.IO server');
        setConnectionStatus('connected');
        
        socketRef.current.emit('joinGame', {
          gameId: gameState?.gameId || gameId,
          userId: uid
        });

        if (mode !== 'unlimited') {
          // FIXED: Only start timer if user is white (goes first)
          if (userColor === 'white') {
            startTimer('white');
          }
        }
        resolve();
      });

      // FIXED: Handle gameStarted event properly
      socketRef.current.on('gameStarted', (data) => {
        console.log('Game started event received:', data);
        
        setWhitePlayerId(data.whitePlayerId);
        setBlackPlayerId(data.blackPlayerId);
        setUserColor(data.whitePlayerId === uid ? 'white' : 'black');
        
        setGameState(prevState => ({
          ...prevState,
          board: data.board,
          turn: data.turn,
          status: 'ongoing',
        }));
        
        setCurrentTurn(data.turn);
        
        if (mode !== 'unlimited') {
          startTimer(data.turn);
        }
      });

      // FIXED: Better gameUpdate handler
      socketRef.current.on('gameUpdate', (data) => {
        console.log('Game update received:', data);
        
        setGameState(prevState => ({
          ...prevState,
          board: data.board,
          turn: data.turn,
          status: data.status,
        }));
        
        setCurrentTurn(data.turn);
        
        if (data.lastMove && data.lastMove.san) {
          setMoves(prev => [...prev, data.lastMove.san]);
        }
        
        if (mode !== 'unlimited') {
          startTimer(data.turn);
        }
        
        if (data.status === 'checkmate' || data.status === 'stalemate') {
          handleGameEnd(data.status, data.winnerId);
        }
      });

      socketRef.current.on('gameState', (data) => {
        console.log('Game state received:', data);
        
        setGameState(prevState => ({
          ...prevState,
          board: data.board,
          turn: data.turn,
          status: data.status,
        }));
        
        setCurrentTurn(data.turn);
        
        if (data.moveHistory) {
          setMoves(data.moveHistory.map(move => move.san));
        }
      });

      socketRef.current.on('gameEnded', (data) => {
        handleGameEnd(data.reason, data.winnerId);
      });

      socketRef.current.on('forfeit', (data) => {
        handleGameEnd('Forfeit', data.winnerId);
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err.message);
        setConnectionStatus('error');
        setError('Failed to connect to game server. Please try again.');
        reject(err);
      });

      socketRef.current.on('error', (data) => {
        console.error('Socket.IO error:', data.message);
        setError(data.message || 'Game error occurred');
        shakeAnimation();
      });

      // Connection timeout
      setTimeout(() => {
        if (socketRef.current && !socketRef.current.connected) {
          setConnectionStatus('timeout');
          setError('Connection timeout. Please check your internet connection.');
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  };

  // FIXED: Timer logic with proper color handling
  const startTimer = (turn) => {
    if (mode === 'unlimited') return;

    clearInterval(userTimerRef.current);
    clearInterval(friendTimerRef.current);

    // Start timer based on whose turn it is and their color
    if ((turn === 'white' && userColor === 'white') || (turn === 'black' && userColor === 'black')) {
      // It's user's turn
      userTimerRef.current = setInterval(() => {
        setUserTime((prev) => {
          if (prev <= 1) {
            clearInterval(userTimerRef.current);
            handleGameEnd('Time out', friendId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // It's friend's turn
      friendTimerRef.current = setInterval(() => {
        setFriendTime((prev) => {
          if (prev <= 1) {
            clearInterval(friendTimerRef.current);
            handleGameEnd('Time out', uid);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSquarePress = (row, col) => {
    if (!gameState || loading || gameState.status !== 'ongoing') {
      return;
    }

    // FIXED: Proper turn checking using userColor
    const isUserTurn = currentTurn === userColor;
    
    if (!isUserTurn) {
      shakeAnimation();
      return;
    }

    if (!selectedSquare) {
      // Select a piece
      if (gameState.board[row][col] && isUserPiece(row, col)) {
        setSelectedSquare({ row, col });
      }
    } else {
      // Attempt to move
      if (selectedSquare.row === row && selectedSquare.col === col) {
        // Deselect if clicking same square
        setSelectedSquare(null);
        return;
      }

      try {
        socketRef.current.emit('move', {
          gameId: gameState.gameId,
          from: { row: selectedSquare.row, col: selectedSquare.col },
          to: { row, col },
          userId: uid,
        });
        setSelectedSquare(null);
      } catch (err) {
        console.error('Move error:', err.message);
        setError('Failed to send move. Please try again.');
        shakeAnimation();
      }
    }
  };

  // FIXED: Proper piece ownership detection
  const isUserPiece = (row, col) => {
    const piece = gameState.board[row][col];
    if (!piece) return false;
    
    const isWhite = piece.toUpperCase() === piece;
    return (userColor === 'white' && isWhite) || (userColor === 'black' && !isWhite);
  };

  const handleForfeit = () => {
    Alert.alert(
      'Forfeit Game',
      'Are you sure you want to forfeit this game?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forfeit',
          style: 'destructive',
          onPress: () => {
            socketRef.current?.emit('forfeit', {
              gameId: gameState.gameId,
              userId: uid,
              winnerId: friendId,
            });
          },
        },
      ]
    );
  };

  const handleGameEnd = (reason, winnerId) => {
    clearInterval(userTimerRef.current);
    clearInterval(friendTimerRef.current);
    
    const winner = winnerId === uid ? user : friend;
    setGameOverMessage(`${reason}. Winner: ${winner?.username || 'Unknown'}`);
    setGameOverModal(true);
  };

  const handleRematch = () => {
    // Reset game state for rematch
    setGameState({
      board: initialBoard,
      gameId: `game_${Date.now()}`,
      turn: 'white',
      status: 'ongoing',
    });
    setUserTime(initialTime);
    setFriendTime(initialTime);
    setCurrentTurn('white');
    setSelectedSquare(null);
    setMoves([]);
    setGameOverModal(false);
    
    if (mode !== 'unlimited') {
      startTimer('white');
    }
  };

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    clearInterval(userTimerRef.current);
    clearInterval(friendTimerRef.current);
  };

  const formatTime = (seconds) => {
    if (mode === 'unlimited') return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSquare = (row, col) => {
    const isDark = (row + col) % 2 === 1;
    const piece = gameState?.board[row][col] || '';
    const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
    const isUserPieceHighlight = piece && isUserPiece(row, col);

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.square,
          {
            backgroundColor: isDark ? '#8B4513' : '#DEB887',
            width: SQUARE_SIZE,
            height: SQUARE_SIZE,
          },
          isSelected && styles.selectedSquare,
          isUserPieceHighlight && currentTurn === userColor && styles.userPiece,
        ]}
        onPress={() => handleSquarePress(row, col)}
        disabled={loading || gameState?.status !== 'ongoing'}
        activeOpacity={0.7}
      >
        {piece ? (
          <Text style={[styles.piece, { fontSize: SQUARE_SIZE * 0.7 }]}>
            {pieceImages[piece] || piece}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderBoard = () => {
    const board = [];
    for (let row = 0; row < 8; row++) {
      const rowSquares = [];
      for (let col = 0; col < 8; col++) {
        rowSquares.push(renderSquare(row, col));
      }
      board.push(
        <View key={row} style={styles.boardRow}>
          {rowSquares}
        </View>
      );
    }
    return board;
  };

  // FIXED: Proper player info with correct turn display
  const renderPlayerInfo = (player, isUser, timeLeft) => {
    const playerColor = isUser ? userColor : (userColor === 'white' ? 'black' : 'white');
    const isPlayerTurn = currentTurn === playerColor;
    
    return (
      <Animated.View style={[
        styles.playerContainer,
        { opacity: fadeAnim, transform: [{ translateY: isUser ? slideAnim : slideAnim }] }
      ]}>
        <LinearGradient
          colors={isPlayerTurn ? ['#4ECDC4', '#44A08D'] : ['#2A2A2A', '#1C1C1C']}
          style={styles.playerGradient}
        >
          <View style={styles.playerInfo}>
            {player?.profile_picture ? (
              <Image source={{ uri: player.profile_picture }} style={styles.profilePic} />
            ) : (
              <View style={styles.placeholderPic}>
                <Text style={styles.placeholderText}>
                  {player?.username?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>
                {player?.username || (isUser ? 'You' : 'Opponent')} ({playerColor})
              </Text>
              <Text style={styles.playerStatus}>
                {isPlayerTurn ? 'Your turn' : 'Waiting...'}
              </Text>
            </View>
          </View>
          <View style={styles.timerContainer}>
            <Text style={[
              styles.timerText,
              timeLeft < 60 && mode !== 'unlimited' && styles.urgentTimer
            ]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderConnectionStatus = () => {
    const statusConfig = {
      connecting: { icon: 'wifi', color: '#FFA500', text: 'Connecting...' },
      connected: { icon: 'wifi', color: '#4ECDC4', text: 'Connected' },
      error: { icon: 'wifi-off', color: '#FF6B6B', text: 'Connection Error' },
      timeout: { icon: 'time', color: '#FF6B6B', text: 'Connection Timeout' },
    };

    const config = statusConfig[connectionStatus];
    
    return (
      <View style={styles.statusContainer}>
        <Ionicons name={config.icon} size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Setting up your game...</Text>
          <Text style={styles.loadingSubtext}>
            Connecting to {friend?.username}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#EDEDED" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.gameMode}>{mode?.toUpperCase()}</Text>
          {renderConnectionStatus()}
        </View>

        <TouchableOpacity onPress={() => setShowMoves(!showMoves)} style={styles.movesButton}>
          <Ionicons name="list" size={24} color="#EDEDED" />
        </TouchableOpacity>
      </Animated.View>

      {/* Friend Info - positioned at top */}
      {renderPlayerInfo(friend, false, friendTime)}

      {/* Chess Board - FIXED: Responsive layout */}
      <Animated.View style={[
        styles.boardContainer,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] }
      ]}>
        <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {renderBoard()}
        </View>
      </Animated.View>

      {/* User Info - positioned at bottom */}
      {renderPlayerInfo(user, true, userTime)}

      {/* Bottom Actions */}
      <Animated.View style={[styles.bottomActions, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.actionButton} onPress={handleForfeit}>
          <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.actionButtonGradient}>
            <Ionicons name="flag" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Forfeit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Error Message */}
      {error ? (
        <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      ) : null}

      {/* Move History Modal */}
      <Modal
        visible={showMoves}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoves(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.movesModal, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.movesHeader}>
              <Text style={styles.movesTitle}>Move History</Text>
              <TouchableOpacity onPress={() => setShowMoves(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.movesList}>
              {moves.length === 0 ? (
                <Text style={styles.noMovesText}>No moves yet</Text>
              ) : (
                moves.map((move, index) => (
                  <Text key={index} style={styles.moveText}>
                    {Math.floor(index / 2) + 1}. {move}
                  </Text>
                ))
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Game Over Modal */}
      <Modal
        visible={gameOverModal}
        transparent
        animationType="fade"
        onRequestClose={() => setGameOverModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.gameOverModal, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverMessage}>{gameOverMessage}</Text>
            
            <View style={styles.gameOverActions}>
              <TouchableOpacity style={styles.gameOverButton} onPress={handleRematch}>
                <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.gameOverButtonGradient}>
                  <Text style={styles.gameOverButtonText}>Rematch</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.gameOverButton} 
                onPress={() => {
                  setGameOverModal(false);
                  navigation.goBack();
                }}
              >
                <View style={styles.exitButtonGradient}>
                  <Text style={styles.exitButtonText}>Exit</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:35,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#EDEDED',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  loadingSubtext: {
    color: '#888',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  gameMode: {
    color: '#EDEDED',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  movesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerContainer: {
    marginHorizontal: '5%', // FIXED: Use percentage for responsive margins
    marginVertical: 10,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  playerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#333',
    marginRight: 15,
  },
  placeholderPic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444',
    marginRight: 15,
  },
  placeholderText: {
    color: '#EDEDED',
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    color: '#EDEDED',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerStatus: {
    color: 'rgba(237, 237, 237, 0.7)',
    fontSize: 14,
  },
  timerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: '#EDEDED',
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
  },
  urgentTimer: {
    color: '#FF6B6B',
  },
  boardContainer: {
    flex: 1, // FIXED: Allow board to expand and fill available space
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: BOARD_SIZE + 20, // Ensure minimum space for board
  },
  board: {
    backgroundColor: '#8B4513',
    borderRadius: 10,
    padding: 5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectedSquare: {
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#44A08D',
  },
  userPiece: {
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
  },
  piece: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  actionButton: {
    marginHorizontal: 10,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  movesModal: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 20,
  },
  movesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  movesTitle: {
    color: '#EDEDED',
    fontSize: 20,
    fontWeight: 'bold',
  },
  movesList: {
    maxHeight: 300,
  },
  noMovesText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  moveText: {
    color: '#EDEDED',
    fontSize: 14,
    paddingVertical: 4,
  },
  gameOverModal: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  gameOverTitle: {
    color: '#EDEDED',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  gameOverMessage: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  gameOverActions: {
    flexDirection: 'row',
    width: '100%',
  },
  gameOverButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  gameOverButtonGradient: {
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
  },
  gameOverButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  exitButtonGradient: {
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: '#333',
  },
  exitButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});