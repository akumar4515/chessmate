
// chessMulti.jsx - FIXED VERSION

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';

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
  ScrollView,
  BackHandler,
  FlatList,
  TextInput,
  Linking,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import io from 'socket.io-client';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { ClickSoundContext } from './clickSound';

const { width, height } = Dimensions.get('window');

// Global error handler for better error management
const globalErrorHandler = {
  handleAudioError: (error) => {
    console.warn('🔊 Audio error handled:', error.message);
    // Could add user notification here if needed
  },
  handleGameError: (error) => {
    console.error('🎮 Game error:', error.message);
    // Could add user notification here if needed
  }
};

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

const BOARD_COLORS = { light: '#EDEDED', dark: '#8B5A5A' };

const pieceImages = {
  r: require('../assets/images/pieces/black-rook.png'),
  n: require('../assets/images/pieces/black-knight.png'),
  b: require('../assets/images/pieces/black-bishop.png'),
  q: require('../assets/images/pieces/black-queen.png'),
  k: require('../assets/images/pieces/black-king.png'),
  p: require('../assets/images/pieces/black-pawn.png'),
  R: require('../assets/images/pieces/white-rook.png'),
  N: require('../assets/images/pieces/white-knight.png'),
  B: require('../assets/images/pieces/white-bishop.png'),
  Q: require('../assets/images/pieces/white-queen.png'),
  K: require('../assets/images/pieces/white-king.png'),
  P: require('../assets/images/pieces/white-pawn.png'),
};

// Utility function to normalize user IDs consistently
const normalizeUserId = (id) => {
  if (id === null || id === undefined) return null;
  return String(id); // Always convert to string for consistency
};

export default function ChessMultiRedesigned() {
  console.log('🔊 ChessMultiRedesigned component starting...');
  
  // players (local and opponent)
  const [user, setUser] = useState(null);
  const clickSoundContext = React.useContext(ClickSoundContext);
  const [friend, setFriend] = useState(null);

  // spectator: players
  const [whitePlayer, setWhitePlayer] = useState(null);
  const [blackPlayer, setBlackPlayer] = useState(null);
  const [isLoadingWinner, setIsLoadingWinner] = useState(false);
  const [currentWinnerId, setCurrentWinnerId] = useState(null);
  const [currentReason, setCurrentReason] = useState(null);
  const [currentTimeoutColor, setCurrentTimeoutColor] = useState(null);

  // game state
  const [gameState, setGameState] = useState(null);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [currentTurn, setCurrentTurn] = useState('white');
  
  // Local chess.js instance for proper game logic
  const [localChess, setLocalChess] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Game over state - clean and simple
  const [gameOverModal, setGameOverModal] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const gameOverModalRef = useRef(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  
  const [disconnectionStartTime, setDisconnectionStartTime] = useState(null);
  const [reconnectTimeout, setReconnectTimeout] = useState(null);
  const [reconnectCountdown, setReconnectCountdown] = useState(0);
  const [gameEndedByTimer, setGameEndedByTimer] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [forfeitModalVisible, setForfeitModalVisible] = useState(false);
  const [moves, setMoves] = useState([]);
  const [showMoves, setShowMoves] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [showTopCaptured, setShowTopCaptured] = useState(false);
  const [showBottomCaptured, setShowBottomCaptured] = useState(false);
  const [kingInCheck, setKingInCheck] = useState(null);

  // Flag to track if the last move was made by the user to avoid double sound
  const [lastMoveWasUser, setLastMoveWasUser] = useState(false);
  
  // Flag to track if this is the first move (timer starts only after white's first move)
  const [isFirstMove, setIsFirstMove] = useState(true);

  // Check for king in check when game state changes
  useEffect(() => {
    if (gameState?.board && currentTurn) {
      const kingCheck = findKingInCheck(gameState.board, currentTurn, gameState.status);
      if (kingCheck && !kingInCheck) {
        setKingInCheck(kingCheck);
      } else if (!kingCheck && kingInCheck) {
        setKingInCheck(null);
      }
    }
  }, [gameState?.board, currentTurn, gameState?.status]);

  // captured
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });

  // Recalculate captured pieces when game state changes
  useEffect(() => {
    if (gameState?.board) {
      const newCapturedPieces = calculateCapturedPieces();
      setCapturedPieces(newCapturedPieces);
    }
  }, [gameState?.board]);


  // sfx
  const [moveSound, setMoveSound] = useState(null);
  const [captureSound, setCaptureSound] = useState(null);
  const [castleSound, setCastleSound] = useState(null);
  const [checkSound, setCheckSound] = useState(null);
  const [promoteSound, setPromoteSound] = useState(null);
  const [gameStartSound, setGameStartSound] = useState(null);
  const [gameEndSound, setGameEndSound] = useState(null);


  // colors and ids
  const [userColor, setUserColor] = useState(null);
  const [whitePlayerId, setWhitePlayerId] = useState(null);
  const [blackPlayerId, setBlackPlayerId] = useState(null);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);

  // chat modal
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Move highlighting removed - clean, distraction-free board experience

  // anim
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const router = useRouter();
  const params = useLocalSearchParams();

  const {
    mode = 'classic',
    initialTime,
    uid,
    friendId,
    gameId,
    whitePlayerId: routeWhitePlayerId,
    blackPlayerId: routeBlackPlayerId,
    isSpectator = false,
    spectatorFriendName,
  } = params;

  const API_URL = 'https://chessmate-backend-lfxo.onrender.com';

  const socketRef = useRef(null);
  const gameTimerRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const authTokenRef = useRef(null);
  const connectionMonitorRef = useRef(null);
  const lastPingRef = useRef(Date.now());
  const lastSoundTimeRef = useRef(0);

  const initialBoard = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R'],
  ];

  // helpers for algebraic <-> indices
  const toAlgebraic = (row, col) => `${String.fromCharCode(97 + col)}${8 - row}`;

  const fromAlgebraic = (sq) => {
    if (typeof sq !== 'string' || sq.length !== 2) return null;
    const file = sq.toLowerCase().charCodeAt(0) - 97; // a->0
    const rank = 8 - parseInt(sq[1], 10); // '8'->0
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return { row: rank, col: file };
  };

  const sameSquare = (a, b) => a && b && a.row === b.row && a.col === b.col;

  // Move validation removed - server handles all move validation

  // sounds
  useEffect(() => {
    console.log('🔊 Component mounted, loading sounds...');
    loadSounds().then(() => {
      console.log('🔊 loadSounds completed');
    }).catch((error) => {
      console.error('🔊 loadSounds failed:', error);
    });
    return () => {
      console.log('🔊 Component unmounting, unloading sounds...');
      unloadSounds();
    };
  }, []);

  const loadSounds = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
      });
      
      const soundPromises = [
        Audio.Sound.createAsync(require('../assets/sounds/move.mp3'), { volume: 0.7 }),
        Audio.Sound.createAsync(require('../assets/sounds/capture.mp3'), { volume: 0.8 }),
        Audio.Sound.createAsync(require('../assets/sounds/castle.mp3'), { volume: 0.7 }),
        Audio.Sound.createAsync(require('../assets/sounds/promote.mp3'), { volume: 0.8 }),
        Audio.Sound.createAsync(require('../assets/sounds/move-check.mp3'), { volume: 0.9 }),
        Audio.Sound.createAsync(require('../assets/sounds/game-start.mp3'), { volume: 0.6 }),
        Audio.Sound.createAsync(require('../assets/sounds/game-end.mp3'), { volume: 0.8 }),
      ];

      const results = await Promise.allSettled(soundPromises);
      const [move, capture, castle, promote, check, gameStart, gameEnd] = results.map(result =>
        result.status === 'fulfilled' ? result.value.sound : null
      );

      setMoveSound(move);
      setCaptureSound(capture);
      setCastleSound(castle);
      setPromoteSound(promote);
      setCheckSound(check);
      setGameStartSound(gameStart);
      setGameEndSound(gameEnd);
    } catch (error) {
      console.warn('🔊 Error loading chess sounds:', error);
    }
  };

  const unloadSounds = async () => {
    try {
      await Promise.all([
        moveSound?.unloadAsync(),
        captureSound?.unloadAsync(),
        castleSound?.unloadAsync(),
        promoteSound?.unloadAsync(),
        checkSound?.unloadAsync(),
        gameStartSound?.unloadAsync(),
        gameEndSound?.unloadAsync(),
      ]);
      console.log('🔊 Sounds unloaded successfully');
    } catch (error) {
      console.warn('🔊 Error unloading sounds:', error);
    }
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

  const playMoveSound = async (moveData) => {
    const now = Date.now();
    // Prevent double sounds with 100ms timeout (reduced from 500ms)
    if (now - lastSoundTimeRef.current < 100) {
      return;
    }
    lastSoundTimeRef.current = now;

    // Always try to play a sound, even if we don't have the specific one
    let soundToPlay = null;
    
    if (moveData.captured && captureSound) {
      console.log('🔊 Playing capture sound');
      soundToPlay = captureSound;
    } else if (moveData.castle && castleSound) {
      console.log('🔊 Playing castle sound');
      soundToPlay = castleSound;
    } else if (moveData.promotion && promoteSound) {
      console.log('🔊 Playing promotion sound');
      soundToPlay = promoteSound;
    } else if (moveData.check && checkSound) {
      console.log('🔊 Playing check sound');
      soundToPlay = checkSound;
    } else if (moveSound) {
      console.log('🔊 Playing default move sound');
      soundToPlay = moveSound;
    }

    if (soundToPlay) {
      console.log('🔊 Calling playSound with:', soundToPlay);
      playSound(soundToPlay);
    } else {
      console.warn('🔊 No sound available to play for move:', moveData);
    }
  };


  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);


  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const showErrorMessage = (message) => {
    console.log('💥 Error:', message); // Debug logging
    setError(message);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
  };

  // Handle disconnection
  const handleDisconnection = () => {
    console.log('🔌 User disconnected from game');
    setIsDisconnected(true);
    setDisconnectionStartTime(Date.now());
    setConnectionStatus('disconnected');
    setReconnectCountdown(30); // Start countdown at 30 seconds
    
    // Clear any existing timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
    
    // Show disconnection message
    showErrorMessage('Connection lost. Game will end in 30 seconds. Press back to forfeit now.');
    
    // Set timeout for reconnection (30 seconds)
    const timeout = setTimeout(() => {
      if (isDisconnected && !gameEndedByTimer) {
        console.log('🔌 Reconnection timeout - ending game');
        handleDisconnectionTimeout();
      }
    }, 30000); // 30 seconds
    
    setReconnectTimeout(timeout);
  };

  // Handle reconnection
  const handleReconnection = () => {
    console.log('🔌 User reconnected to game');
    setIsDisconnected(false);
    setDisconnectionStartTime(null);
    setConnectionStatus('connected');
    setError(''); // Clear disconnection message
    setReconnectCountdown(0); // Clear countdown
    setGameEndedByTimer(false); // Reset timer flag
    
    // Clear reconnection timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
  };

  // Handle disconnection timeout
  const handleDisconnectionTimeout = () => {
    console.log('🔌 Disconnection timeout - making opponent winner');
    
    // Prevent multiple game endings
    if (gameEndedByTimer) return;
    setGameEndedByTimer(true);
    
    // Clear timers
    clearInterval(gameTimerRef.current);
    stopConnectionMonitor();
    
    // Determine winner (opponent wins due to disconnection)
    const normalizedUid = normalizeUserId(uid);
    const normalizedWhitePlayerId = normalizeUserId(whitePlayerId);
    const normalizedBlackPlayerId = normalizeUserId(blackPlayerId);
    
    let winnerId;
    if (normalizedUid === normalizedWhitePlayerId) {
      winnerId = normalizedBlackPlayerId; // Black player wins
    } else {
      winnerId = normalizedWhitePlayerId; // White player wins
    }
    
    // Emit forfeit with disconnection reason
    if (socketRef.current && gameState?.gameId) {
      socketRef.current.emit('forfeit', { 
        gameId: normalizeUserId(gameState.gameId),
        reason: 'disconnection_timeout'
      });
    }
    
    // End the game locally
    handleGameEnd('disconnection', winnerId);
    
    // Show specific message for disconnection timeout
    setGameOverMessage('Connection lost. Your opponent wins due to disconnection.');
    setGameOverModal(true);
    setGameEnded(true);
  };


  const loadPlayersById = useCallback(async (wId, bId) => {
    try {
      const t = authTokenRef.current;
      const normalizedWId = normalizeUserId(wId);
      const normalizedBId = normalizeUserId(bId);
      const normalizedUid = normalizeUserId(uid);
      
      console.log('📍 Loading players:', { whiteId: normalizedWId, blackId: normalizedBId, currentUser: normalizedUid });
      
      const [w, b] = await Promise.all([
        axios.get(`${API_URL}/api/users/${normalizedWId}`, { 
          headers: { Authorization: `Bearer ${t}` } 
        }).catch(() => ({ data: { username: 'Unknown White', id: normalizedWId } })),
        axios.get(`${API_URL}/api/users/${normalizedBId}`, { 
          headers: { Authorization: `Bearer ${t}` } 
        }).catch(() => ({ data: { username: 'Unknown Black', id: normalizedBId } })),
      ]);

      setWhitePlayer(w.data);
      setBlackPlayer(b.data);
      
      // For non-spectator mode, also set friend and user data
      if (!isSpectator) {
        if (normalizedUid === normalizedWId) {
          // Current user is white player
          setUser(w.data);
          setFriend(b.data);
        } else if (normalizedUid === normalizedBId) {
          // Current user is black player
          setUser(b.data);
          setFriend(w.data);
        }
      }
      
      console.log('✅ Players loaded:', { white: w.data, black: b.data });
      
    } catch {
      setWhitePlayer({ username: 'Unknown White', id: normalizedWId });
      setBlackPlayer({ username: 'Unknown Black', id: normalizedBId });
    }
  }, [isSpectator, uid]);

  // bootstrap
  useEffect(() => {
    let mounted = true;

    console.log('🚀 ChessMulti component mounted:', { 
      isSpectator, 
      gameId, 
      friendId, 
      uid,
      mode 
    });

    (async () => {
      try {
        setLoading(true);
        setError('');

        const token = await AsyncStorage.getItem('token');
        authTokenRef.current = token;

        if (!token) throw new Error('No authentication token found');

        const normalizedUid = normalizeUserId(uid);
        const normalizedFriendId = normalizeUserId(friendId);
        const normalizedGameId = normalizeUserId(gameId);

        console.log('🚀 Starting game with params:', {
          uid: normalizedUid,
          friendId: normalizedFriendId,
          gameId: normalizedGameId,
          isSpectator,
          routeWhitePlayerId: normalizeUserId(routeWhitePlayerId),
          routeBlackPlayerId: normalizeUserId(routeBlackPlayerId)
        });

        if (!normalizedUid || !normalizedGameId || (isSpectator && !normalizedFriendId)) {
          throw new Error('Missing required route parameters');
        }

        // preload users for non-spectator
        if (!isSpectator) {
          const [userResponse, friendResponse] = await Promise.all([
            axios.get(`${API_URL}/api/users/${normalizedUid}`, { 
              headers: { Authorization: `Bearer ${token}` } 
            }).catch(() => ({ data: { username: 'Unknown User', id: normalizedUid } })),
            axios.get(`${API_URL}/api/users/${normalizedFriendId}`, { 
              headers: { Authorization: `Bearer ${token}` } 
            }).catch(() => ({ data: { username: 'Unknown Opponent', id: normalizedFriendId } })),
          ]);

          if (!mounted) return;

          setUser(userResponse.data);
          setFriend(friendResponse.data);
          console.log('✅ User and friend loaded:', { user: userResponse.data, friend: friendResponse.data });
        }

        if (routeWhitePlayerId && routeBlackPlayerId) {
          const normalizedWhiteId = normalizeUserId(routeWhitePlayerId);
          const normalizedBlackId = normalizeUserId(routeBlackPlayerId);
          
          setWhitePlayerId(normalizedWhiteId);
          setBlackPlayerId(normalizedBlackId);
          
          const userIsWhite = normalizedWhiteId === normalizedUid;
          setUserColor(userIsWhite ? 'white' : 'black');
          setIsBoardFlipped(!userIsWhite);
          
          console.log('🎯 Color assignment:', { 
            userIsWhite, 
            userColor: userIsWhite ? 'white' : 'black',
            whiteId: normalizedWhiteId,
            blackId: normalizedBlackId,
            userId: normalizedUid
          });

          // Load players for both spectator and non-spectator mode
            await loadPlayersById(normalizedWhiteId, normalizedBlackId);
        } else if (!isSpectator) {
          const normalizedWhiteId = normalizeUserId(uid);
          const normalizedBlackId = normalizeUserId(friendId);
          
          setWhitePlayerId(normalizedWhiteId);
          setBlackPlayerId(normalizedBlackId);
          setUserColor('white');
          
          console.log('🎯 Default color assignment (white):', { 
            whiteId: normalizedWhiteId, 
            blackId: normalizedBlackId 
          });
          
          // Load players for non-spectator mode
          await loadPlayersById(normalizedWhiteId, normalizedBlackId);
        } else {
          setWhitePlayer({ username: 'Unknown White' });
          setBlackPlayer({ username: 'Unknown Black' });
        }

        setGameState({
          board: initialBoard,
          gameId: normalizedGameId,
          turn: 'white',
          status: 'ongoing',
        });
        setGameEndedByTimer(false); // Reset timer flag when game starts
        setIsFirstMove(true); // Reset first move flag for new game

        // Calculate initial captured pieces after gameState is set
        setTimeout(() => {
          const initialCapturedPieces = calculateCapturedPieces();
          setCapturedPieces(initialCapturedPieces);
        }, 100);

        // Set initial timers based on game mode
        let initialTime;
        switch (mode) {
          case 'classic': initialTime = 60; break;
          case 'blitz': initialTime = 30; break;
          case 'unlimited': initialTime = 999999; break;
          case 'rush': initialTime = 20; break;
          default: initialTime = 60;
        }
        setWhiteTime(initialTime);
        setBlackTime(initialTime);

        await initializeSocket(token);

      } catch (err) {
        console.error('❌ Bootstrap error:', err);
        showErrorMessage(err.message || 'Failed to start game. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [isSpectator, loadPlayersById]);


  // Connection monitoring
  const startConnectionMonitor = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }
    
    connectionMonitorRef.current = setInterval(() => {
      if (socketRef.current) {
        const now = Date.now();
        const timeSinceLastPing = now - lastPingRef.current;
        
        // If no ping received for 30 seconds, consider connection stale
        if (timeSinceLastPing > 30000) {
          console.log('⚠️ Connection stale, attempting to reconnect...');
          if (socketRef.current.connected) {
            socketRef.current.disconnect();
          }
          socketRef.current.connect();
        }
        
        // Send ping to server
        socketRef.current.emit('ping');
      }
    }, 10000); // Check every 10 seconds
  };

  const stopConnectionMonitor = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
      connectionMonitorRef.current = null;
    }
  };


  // Move highlighting removed - clean, distraction-free board experience

  // socket init
  const initializeSocket = async (token) =>
    new Promise((resolve, reject) => {
      console.log('🔌 Initializing socket connection...');
      
      socketRef.current = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 10,
        forceNew: true,
        upgrade: true,
        rememberUpgrade: true,
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected successfully');
        setConnectionStatus('connected');
        handleReconnection(); // Handle reconnection
        playSound(gameStartSound);
        
        // Start connection monitoring
        startConnectionMonitor();

        const normalizedUid = normalizeUserId(uid);
        const normalizedGameId = normalizeUserId(gameId);
        const normalizedFriendId = normalizeUserId(friendId);

        if (isSpectator) {
          console.log('👁️ Joining as spectator:', { gameId: normalizedGameId, friendId: normalizedFriendId });
          
          socketRef.current.emit('joinAsSpectator', { 
            gameId: normalizedGameId, 
            friendId: normalizedFriendId 
          }, (res) => {
            console.log('👁️ Spectator join response:', res);
            console.log('👁️ Spectator join - socket connected:', socketRef.current?.connected);
            console.log('👁️ Spectator join - socket ID:', socketRef.current?.id);
            
            if (!res?.ok) {
              console.log('❌ Spectator join failed:', res?.error);
              showErrorMessage(res?.error || 'Failed to join as spectator. Game may have ended.');
              setConnectionStatus('error');
              reject(new Error(res?.error || 'Failed to join as spectator'));
            } else {
              console.log('✅ Joined as spectator successfully');
              resolve();
            }
          });
        } else {
          console.log('🎮 Joining game as player:', { gameId: normalizedGameId, userId: normalizedUid });
          
          socketRef.current.emit('joinGame', { 
            gameId: normalizedGameId, 
            userId: normalizedUid 
          });

          // Timer will start only when white makes the first move
          resolve();
        }
      });


      // spectator initial sync
      console.log('👁️ Setting up spectator game state listener');
      socketRef.current.on('spectatorGameState', (data) => {
        console.log('👁️ Received spectator game state:', data);
        console.log('👁️ Spectator game state data keys:', Object.keys(data));
        console.log('👁️ Spectator isSpectator:', isSpectator);
        console.log('👁️ Spectator game state - whitePlayerName:', data.whitePlayerName);
        console.log('👁️ Spectator game state - blackPlayerName:', data.blackPlayerName);
        
        setWhitePlayerId(normalizeUserId(data.whitePlayerId));
        setBlackPlayerId(normalizeUserId(data.blackPlayerId));
        
        setGameState({ 
          board: data.board, 
          gameId: data.gameId, 
          turn: data.turn, 
          status: data.status 
        });
        
        setCurrentTurn(data.turn);
        
        // Set player data directly from server (no API call needed)
        console.log('👁️ Setting player data from server:', { 
          whitePlayerName: data.whitePlayerName, 
          blackPlayerName: data.blackPlayerName,
          whitePlayerId: data.whitePlayerId,
          blackPlayerId: data.blackPlayerId,
          fullData: data
        });
        
        const whitePlayerData = { 
          username: data.whitePlayerName || 'White Player', 
          id: normalizeUserId(data.whitePlayerId) 
        };
        const blackPlayerData = { 
          username: data.blackPlayerName || 'Black Player', 
          id: normalizeUserId(data.blackPlayerId) 
        };
        
        console.log('👁️ Setting white player:', whitePlayerData);
        console.log('👁️ Setting black player:', blackPlayerData);
        
        setWhitePlayer(whitePlayerData);
        setBlackPlayer(blackPlayerData);
        
        // Set initial timers for spectators based on game mode
        let initialTime;
        switch (mode) {
          case 'classic': initialTime = 60; break;
          case 'blitz': initialTime = 30; break;
          case 'unlimited': initialTime = 999999; break;
          case 'rush': initialTime = 20; break;
          default: initialTime = 60;
        }
        setWhiteTime(initialTime);
        setBlackTime(initialTime);
        console.log('👁️ Set initial timer values for spectator:', { mode, initialTime });
        
        // Start timer for spectators if game is already in progress
        if ((mode || 'classic') !== 'unlimited' && data.turn) {
          console.log('👁️ Starting timer for spectator on turn:', data.turn, 'gameId:', data.gameId);
          startGameTimer(data.turn);
        }
        
        // Update king in check status
        const kingCheck = findKingInCheck(data.board, data.turn, data.status);
        setKingInCheck(kingCheck);
        setIsBoardFlipped(false);
        
        // Calculate captured pieces locally instead of relying on server
        const newCapturedPieces = calculateCapturedPieces();
        setCapturedPieces(newCapturedPieces);
        if (data.moveHistory) setMoves(data.moveHistory.map((m) => m.san || m));

        loadPlayersById(data.whitePlayerId, data.blackPlayerId).catch(() => {});

        setSelectedSquare(null);
      });

      socketRef.current.on('gameStarted', (data) => {
        console.log('🎮 Game started event received:', data);
        
        setWhitePlayerId(normalizeUserId(data.whitePlayerId));
        setBlackPlayerId(normalizeUserId(data.blackPlayerId));
        
        setGameState((prev) => ({ 
          ...prev, 
          board: data.board, 
          turn: data.turn, 
          status: 'ongoing' 
        }));
        setGameEndedByTimer(false); // Reset timer flag when game starts
        setIsFirstMove(true); // Reset first move flag for new game
        
        setCurrentTurn(data.turn);
        
        // Update local chess.js instance
        updateLocalChess(data.board, data.turn);
        
        // Update king in check status
        const kingCheck = findKingInCheck(data.board, data.turn, data.status);
        setKingInCheck(kingCheck);
        playSound(gameStartSound);
        
        setSelectedSquare(null);

        // Calculate captured pieces locally instead of relying on server
        const newCapturedPieces = calculateCapturedPieces();
        setCapturedPieces(newCapturedPieces);

        // Load players for both spectator and non-spectator mode
          loadPlayersById(data.whitePlayerId, data.blackPlayerId).catch(() => {});
        
        // Timer will start only when white makes the first move
      });

      socketRef.current.on('gameState', (data) => {
        console.log('📊 Game state update:', data);
        
        setGameState((p) => ({ ...p, board: data.board, turn: data.turn, status: data.status }));
        setCurrentTurn(data.turn);
        
        // Update local chess.js instance
        updateLocalChess(data.board, data.turn);
        
        // Update king in check status
        const kingCheck = findKingInCheck(data.board, data.turn, data.status);
        setKingInCheck(kingCheck);
        
        if (data.moveHistory) setMoves(data.moveHistory.map((m) => m.san || m));
        // Calculate captured pieces locally instead of relying on server
        const newCapturedPieces = calculateCapturedPieces();
        setCapturedPieces(newCapturedPieces);
        
        setSelectedSquare(null);
      });

      socketRef.current.on('gameUpdate', (data) => {
        console.log('🎯 Game update received:', data);
        console.log('🎯 Last move data:', data.lastMove);
        console.log('🎯 Current turn:', data.turn, 'User color:', userColor);
        
        // Only play sound for opponent moves or in spectator mode
        const wasOpponentMove = data.lastMove && data.lastMove.color !== userColor;
        
        
        if ((wasOpponentMove || isSpectator) && data.lastMove) {
          console.log('🎵 Playing opponent move sound');
          playMoveSound(data.lastMove);
        } else if (lastMoveWasUser) {
          console.log('🎵 Skipping sound for user\'s own move echo');
        } else {
          console.log('🎵 No sound conditions met');
        }
        
        setLastMoveWasUser(false); // Reset flag after processing
        
        setGameState((p) => ({ ...p, board: data.board, turn: data.turn, status: data.status }));
        setCurrentTurn(data.turn);
        
        // Update local chess.js instance
        updateLocalChess(data.board, data.turn);
        
        // Update king in check status
        const kingCheck = findKingInCheck(data.board, data.turn, data.status);
        setKingInCheck(kingCheck);
        
        setSelectedSquare(null);

        if (data.lastMove?.san) setMoves((prev) => [...prev, data.lastMove.san]);
        if (data.moveHistory) setMoves(data.moveHistory.map((m) => m.san || m));

        if (data.lastMove) {
          // Always recalculate captured pieces after a move
          console.log('Calculating captured pieces after move...');
          const newCapturedPieces = calculateCapturedPieces();
          console.log('New captured pieces after move:', newCapturedPieces);
          setCapturedPieces(newCapturedPieces);
        }

        // Reset timer immediately after move, then start timer for next player
        if ((mode || 'classic') !== 'unlimited' && !isSpectator) {
          console.log('⏰ Move made, resetting timer and starting for turn:', data.turn);
          
          // Reset timer for the player who just moved
          resetTimerAfterMove(data.turn);
          
          // Start timer for the next player
          startGameTimer(data.turn);
        }

        if (['checkmate', 'stalemate', 'draw'].includes(data.status)) {
          console.log('🏁 Game status update - calling handleGameEnd:', { status: data.status, winnerId: data.winnerId });
          handleGameEnd(data.status, data.winnerId);
        }
      });

      // Clean game ended listener - works for all game end reasons (forfeit, timeout, checkmate, etc.)
      console.log('🏁 Setting up game ended listener');
      socketRef.current.on('gameEnded', (data) => {
        console.log('🏁 Game ended event received:', data);
        console.log('🏁 Current state before handleGameEnd:', { 
          gameOverModal, 
          gameEnded, 
          isSpectator, 
          userColor 
        });
        console.log('🏁 Spectator player data before game end:', {
          whitePlayer: whitePlayer?.username,
          blackPlayer: blackPlayer?.username,
          whitePlayerId,
          blackPlayerId
        });
        playSound(gameEndSound);
        handleGameEnd(data.reason, data.winnerId);
      });

      // Handle timeout events from server (server sends gameEnded with reason: 'timeout')
      // This is handled by the existing gameEnded listener above

      socketRef.current.on('disconnect', () => {
        console.log('❌ Disconnected from game server');
        handleDisconnection(); // Handle disconnection
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err);
        globalErrorHandler.handleGameError(err);
        setConnectionStatus('error');
        showErrorMessage('Failed to connect to game server. Please try again.');
        reject(err);
      });

      socketRef.current.on('error', (data) => {
        console.error('❌ Socket error:', data);
        
        // Handle specific error types
        if (data.message === 'Game not found') {
          console.log('⚠️ Game not found, redirecting to main menu');
          showErrorMessage('Game session expired. Returning to main menu.');
          setTimeout(() => {
            router.back();
          }, 2000);
        } else {
        showErrorMessage(data.message || 'Game error occurred');
        shakeAnimation();
        }
      });

      setTimeout(() => {
        if (socketRef.current && !socketRef.current.connected) {
          setConnectionStatus('timeout');
          showErrorMessage('Connection timeout. Please check your internet connection.');
          reject(new Error('Connection timeout'));
        }
      }, 15000);

      // chat live listener
      socketRef.current.on('chatMessage', (m) => {
        console.log('💬 Chat message received:', m);
        const normalizedUid = normalizeUserId(uid);
        const normalizedFriendId = normalizeUserId(friendId);
        
        if (!normalizedFriendId || !normalizedUid) return;
        
        const normalizedSenderId = normalizeUserId(m.senderId);
        
        if (normalizedSenderId === normalizedUid || normalizedSenderId === normalizedFriendId) {
          setChatMessages((prev) => [...prev, m]);
        }
      });

      // Handle connection status updates
      socketRef.current.on('connectionStatus', (data) => {
        console.log('📶 Connection status:', data);
        setConnectionStatus(data.status);
      });

      // Handle disconnection
      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setConnectionStatus('disconnected');
        
        
        // Handle different disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          console.log('🔄 Server disconnected, attempting reconnection...');
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.connect();
            }
          }, 2000);
        } else if (reason === 'io client disconnect') {
          // Client initiated disconnect, don't reconnect
          console.log('🔌 Client disconnected intentionally');
        } else if (reason === 'ping timeout' || reason === 'transport close' || reason === 'transport error') {
          // Network issues, try to reconnect
          console.log('🔄 Network issue detected, attempting reconnection...');
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.connect();
            }
          }, 3000);
        }
      });

      // Handle reconnection
      socketRef.current.on('reconnect', () => {
        console.log('🔄 Socket reconnected');
        setConnectionStatus('connected');
        
        const normalizedUid = normalizeUserId(uid);
        const normalizedGameId = normalizeUserId(gameId);
        const normalizedFriendId = normalizeUserId(friendId);
        
        // Check if game still exists before rejoining
        if (!gameState?.gameId) {
          console.log('⚠️ No game state available, cannot rejoin');
          showErrorMessage('Game session lost. Please return to the main menu.');
          return;
        }
        
        // Rejoin game or spectator mode with delay
        setTimeout(() => {
        if (isSpectator) {
            console.log('🔄 Rejoining as spectator after reconnection');
          socketRef.current.emit('joinAsSpectator', { 
            gameId: normalizedGameId, 
            friendId: normalizedFriendId 
            }, (response) => {
              if (response && !response.ok) {
                console.error('❌ Failed to rejoin as spectator:', response.error);
                showErrorMessage('Failed to rejoin game. Please return to the main menu.');
              }
          });
        } else {
            console.log('🔄 Rejoining game after reconnection');
          socketRef.current.emit('joinGame', { 
            gameId: normalizedGameId, 
            userId: normalizedUid 
            }, (response) => {
              if (response && !response.ok) {
                console.error('❌ Failed to rejoin game:', response.error);
                showErrorMessage('Failed to rejoin game. Please return to the main menu.');
              }
            });
          }
        }, 500);
      });

      // Handle reconnection attempts
      socketRef.current.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}`);
        setConnectionStatus('reconnecting');
      });

      // Handle reconnection errors
      socketRef.current.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error);
        setConnectionStatus('error');
      });

      // Handle reconnection failure
      socketRef.current.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
        setConnectionStatus('failed');
        showErrorMessage('Failed to reconnect to game server. Please restart the app.');
      });

      // Handle ping/pong for connection monitoring
      socketRef.current.on('pong', () => {
        lastPingRef.current = Date.now();
        console.log('🏓 Pong received, connection alive');
      });

    });

  // Reset timer for the player who just moved
  const resetTimerAfterMove = (nextPlayerTurn) => {
    // Determine who just moved (opposite of next player)
    const justMoved = nextPlayerTurn === 'white' ? 'black' : 'white';
    
    console.log('⏰ Resetting timer for player who just moved:', justMoved);
    
    if (mode === 'blitz') {
      // For blitz: reset to 30 seconds
      if (justMoved === 'white') {
        console.log('⏰ Resetting white timer to 30s (blitz)');
        setWhiteTime(30);
      } else {
        console.log('⏰ Resetting black timer to 30s (blitz)');
        setBlackTime(30);
      }
    } else if (mode === 'classic') {
      // For classic: reset to 60 seconds
      if (justMoved === 'white') {
        console.log('⏰ Resetting white timer to 60s (classic)');
        setWhiteTime(60);
      } else {
        console.log('⏰ Resetting black timer to 60s (classic)');
        setBlackTime(60);
      }
    } else if (mode === 'rush') {
      // For rush: reset to 20 seconds
      if (justMoved === 'white') {
        console.log('⏰ Resetting white timer to 20s (rush)');
        setWhiteTime(20);
      } else {
        console.log('⏰ Resetting black timer to 20s (rush)');
        setBlackTime(20);
      }
    }
  };

  const startGameTimer = (turn) => {
    if (mode === 'unlimited') return;
    
    // Prevent starting timer if game has ended
    if (gameEnded || gameEndedByTimer) {
      console.log('⏰ Timer not started - game has ended');
      return;
    }

    // Clear existing timer
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }

    console.log('⏰ Starting countdown timer for turn:', turn, 'mode:', mode);

    // Start countdown for current player's color
    const timerCallback = () => {
      // Check if game has ended during timer tick
      if (gameEnded || gameEndedByTimer) {
        console.log('⏰ Timer stopped - game has ended');
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
        return;
      }
      
      console.log('⏰ Timer tick for turn:', turn, 'whiteTime:', whiteTime, 'blackTime:', blackTime, 'isSpectator:', isSpectator);
      if (turn === 'white') {
        setWhiteTime(prev => {
          console.log('⏰ White timer tick:', prev);
          if (prev <= 1) {
            console.log('⏰ White timer timeout!');
            clearInterval(gameTimerRef.current);
            gameTimerRef.current = null;
            console.log('⏰ Calling handleTimerTimeout for white timeout');
            handleTimerTimeout('white');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          console.log('⏰ Black timer tick:', prev);
          if (prev <= 1) {
            console.log('⏰ Black timer timeout!');
            clearInterval(gameTimerRef.current);
            gameTimerRef.current = null;
            console.log('⏰ Calling handleTimerTimeout for black timeout');
            handleTimerTimeout('black');
            return 0;
          }
          return prev - 1;
        });
      }
    };

    gameTimerRef.current = setInterval(timerCallback, 1000);
    console.log('⏰ Timer interval created with ID:', gameTimerRef.current, 'for turn:', turn);
  };

  // Timer timeout handler - works exactly like forfeit
  const handleTimerTimeout = (timeoutColor) => {
    console.log('🚨 handleTimerTimeout called with:', { timeoutColor, gameEndedByTimer, userColor, isSpectator });
    
    if (gameEndedByTimer) return;
    setGameEndedByTimer(true);
    
    const normalizedUid = normalizeUserId(uid);
    
    // For spectators, just wait for server event (like forfeit)
    if (isSpectator) {
      console.log('🚨 SPECTATOR: Waiting for server timeout event');
      return; // Spectators don't emit, just wait for server
    }
    
    // Players emit timeout event to server (like forfeit)
    console.log('🚨 Player timeout - checking conditions:', {
      hasSocket: !!socketRef.current,
      hasGameId: !!gameState?.gameId,
      gameEnded,
      gameId: gameState?.gameId,
      timeoutUserId: normalizedUid,
      timeoutColor
    });
    
    // Try to get gameId from multiple sources
    const currentGameId = gameState?.gameId || gameId || null;
    console.log('🚨 GameId sources:', { 
      'gameState?.gameId': gameState?.gameId, 
      'gameId prop': gameId, 
      'final gameId': currentGameId 
    });
    
    if (socketRef.current && currentGameId && !gameEnded) {
      console.log('🚨 Emitting gameTimeout to server');
      socketRef.current.emit('gameTimeout', {
        gameId: currentGameId,
        timeoutUserId: normalizedUid,
        timeoutColor
      });
    } else {
      console.log('🚨 NOT emitting gameTimeout - conditions not met:', {
        'socketRef.current': !!socketRef.current,
        'currentGameId': !!currentGameId,
        '!gameEnded': !gameEnded,
        'gameEnded value': gameEnded
      });
    }
  };

  const handleExit = () => {
    setExitModalVisible(true);
  };

  const handleConfirmExit = () => {
    // Clean up timers and leave game, but keep socket connected
    if (socketRef.current && gameState?.gameId) {
      if (isSpectator) {
        socketRef.current.emit('leaveSpectator', { gameId: normalizeUserId(gameState.gameId) });
      } else {
        // If disconnected, make opponent winner before leaving
        if (isDisconnected) {
          const normalizedUid = normalizeUserId(uid);
          const normalizedWhitePlayerId = normalizeUserId(whitePlayerId);
          const normalizedBlackPlayerId = normalizeUserId(blackPlayerId);
          
          let winnerId;
          if (normalizedUid === normalizedWhitePlayerId) {
            winnerId = normalizedBlackPlayerId; // Black player wins
          } else {
            winnerId = normalizedWhitePlayerId; // White player wins
          }
          
          // Emit forfeit with disconnection reason
          socketRef.current.emit('forfeit', { 
            gameId: normalizeUserId(gameState.gameId),
            reason: 'disconnection_forfeit'
          });
        } else {
          socketRef.current.emit('leaveGame', { gameId: normalizeUserId(gameState.gameId) });
        }
      }
    }
    clearInterval(gameTimerRef.current);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    stopConnectionMonitor();
    
    setExitModalVisible(false);
    setGameOverModal(false);
    gameOverModalRef.current = false;
    router.back();
  };

  const handleCancelExit = () => {
    setExitModalVisible(false);
  };

  const handleForfeit = useCallback(() => {
    setForfeitModalVisible(true);
  }, []);

  const handleConfirmForfeit = useCallback(() => {
    if (socketRef.current && gameState?.gameId) {
      socketRef.current.emit('forfeit', {
        gameId: gameState.gameId,
        userId: normalizeUserId(uid),
      });
    }
    setForfeitModalVisible(false);
  }, [gameState?.gameId, uid]);

  const handleCancelForfeit = useCallback(() => {
    setForfeitModalVisible(false);
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (showMoves) { setShowMoves(false); return true; }
      if (chatVisible) { setChatVisible(false); return true; }
      if (gameOverModal || gameOverModalRef.current) { 
        // If game has ended, allow direct exit
        if (gameEnded) {
          handleConfirmExit();
          return true;
        }
        // Just close the modal, don't exit the game
        setGameOverModal(false); 
        gameOverModalRef.current = false;
        return true; 
      }
      if (exitModalVisible) { setExitModalVisible(false); return true; }
      if (forfeitModalVisible) { setForfeitModalVisible(false); return true; }
      
      // If game has ended, allow direct exit without confirmation
      if (gameEnded) {
        handleConfirmExit();
        return true;
      }
      
      // If disconnected, treat back button as exit/forfeit
      if (isDisconnected) {
        console.log('🔌 Disconnected user pressed back - treating as exit/forfeit');
        // For disconnected users, immediately forfeit and exit
        if (socketRef.current && gameState?.gameId) {
          const normalizedUid = normalizeUserId(uid);
          const normalizedWhitePlayerId = normalizeUserId(whitePlayerId);
          const normalizedBlackPlayerId = normalizeUserId(blackPlayerId);
          
          let winnerId;
          if (normalizedUid === normalizedWhitePlayerId) {
            winnerId = normalizedBlackPlayerId; // Black player wins
          } else {
            winnerId = normalizedWhitePlayerId; // White player wins
          }
          
          // Emit forfeit with disconnection reason
          socketRef.current.emit('forfeit', { 
            gameId: normalizeUserId(gameState.gameId),
            reason: 'disconnection_forfeit'
          });
          
          // End the game locally
          handleGameEnd('disconnection', winnerId);
        }
        handleConfirmExit();
        return true;
      }
      
      if (isSpectator) {
        if (socketRef.current && gameId) {
          socketRef.current.emit('leaveSpectator', { gameId: normalizeUserId(gameId) });
        }
        router.back();
        return true;
      }
      
      // For non-spectator mode, show forfeit game option instead of exit
      if (!isSpectator) {
        handleForfeit();
        return true;
      }
      
      handleExit();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [showMoves, chatVisible, gameOverModal, exitModalVisible, forfeitModalVisible, isSpectator, gameId, router, handleExit, gameEnded, handleForfeit, isDisconnected]);

  // Countdown timer for reconnection
  useEffect(() => {
    let countdownInterval;
    
    if (isDisconnected && reconnectCountdown > 0) {
      countdownInterval = setInterval(() => {
        setReconnectCountdown(prev => {
          if (prev <= 1) {
            // Countdown finished, timeout will be handled by the main timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [isDisconnected, reconnectCountdown]);

  // Enhanced disconnect timeout handling
  useEffect(() => {
    if (isDisconnected && !gameEndedByTimer) {
      const timeout = setTimeout(() => {
        if (isDisconnected && !gameEndedByTimer) {
          console.log('🔌 30-second disconnect timeout reached - ending game');
          handleDisconnectionTimeout();
        }
      }, 30000); // 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [isDisconnected, gameEndedByTimer]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      // Clear game timer
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
    };
  }, [reconnectTimeout]);

  // Simplified and reliable game end handler
  const handleGameEnd = (reason, winnerId, timeoutColor = null) => {
    console.log('🏁 handleGameEnd called:', { reason, winnerId, timeoutColor, isSpectator, userColor });
    
    // Store game end data for later use
    setCurrentWinnerId(winnerId);
    setCurrentReason(reason);
    setCurrentTimeoutColor(timeoutColor);
    
    // Stop all timers and monitoring
    clearInterval(gameTimerRef.current);
    gameTimerRef.current = null;
    stopConnectionMonitor();
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
    
    setGameEndedByTimer(true);
    setGameEnded(true);

    // Determine winner name - with loading state
    let winnerName = '';
    
    if (reason === 'draw' || reason === 'stalemate') {
      winnerName = 'Draw';
    } else if (winnerId) {
    const normalizedWinnerId = normalizeUserId(winnerId);
    const normalizedUid = normalizeUserId(uid);
    const normalizedWhitePlayerId = normalizeUserId(whitePlayerId);
    const normalizedBlackPlayerId = normalizeUserId(blackPlayerId);
    const normalizedFriendId = normalizeUserId(friendId);
    
      console.log('🏁 Winner determination:', {
        winnerId,
      normalizedWinnerId, 
      normalizedUid, 
        normalizedWhitePlayerId,
        normalizedBlackPlayerId,
        isSpectator,
        userColor,
        whitePlayer: whitePlayer?.username,
        blackPlayer: blackPlayer?.username,
        whitePlayerId,
        blackPlayerId,
        timeoutColor
      });
      
      // Handle timeout case - winner is opposite of who timed out
      if (reason === 'timeout' && timeoutColor) {
        const winnerColor = timeoutColor === 'white' ? 'black' : 'white';
        console.log('🏁 Timeout winner determination:', { timeoutColor, winnerColor });
        
        if (isSpectator) {
          // For spectators, show which player won
          if (winnerColor === 'white') {
            winnerName = 'White Player Won';
          } else {
            winnerName = 'Black Player Won';
          }
        } else {
          if (userColor === winnerColor) {
            winnerName = 'You';
          } else {
            winnerName = 'Opponent';
          }
        }
      } else {
        // Normal winner determination
        if (isSpectator) {
          // For spectators, show which player won
          if (normalizedWinnerId === normalizedWhitePlayerId) {
            winnerName = 'White Player Won';
          } else {
            winnerName = 'Black Player Won';
          }
        } else {
          // For players, show You/Opponent
          if (normalizedWinnerId === normalizedUid) {
            winnerName = 'You';
          } else {
            winnerName = 'Opponent';
          }
        }
      }
    } else {
      winnerName = 'Opponent';
    }

    // Set game over message and show modal
    const message = `${reason.charAt(0).toUpperCase() + reason.slice(1)}. Winner: ${winnerName}`;
    console.log('🏁 Setting game over message:', message);
    
    setGameOverMessage(message);
    setGameOverModal(true);
    gameOverModalRef.current = true;
    
    console.log('🏁 Game over modal should be visible now:', { 
      gameOverModal: true, 
      gameOverModalRef: gameOverModalRef.current, 
      message,
      isSpectator 
    });

    // Force modal visibility with fallback
    setTimeout(() => {
      if (!gameOverModal && !gameOverModalRef.current) {
        console.log('🏁 Fallback: Forcing modal visibility');
        setGameOverModal(true);
        gameOverModalRef.current = true;
      }
    }, 100);

    // Additional fallback for timeout specifically
    if (reason === 'timeout') {
      setTimeout(() => {
        console.log('🏁 Timeout fallback: Double-checking modal visibility');
        if (!gameOverModal && !gameOverModalRef.current) {
          console.log('🏁 Timeout fallback: Forcing modal visibility again');
          setGameOverModal(true);
          gameOverModalRef.current = true;
        }
      }, 200);
    }

    // Update ELO
    try {
      const normalizedWinnerId = winnerId ? normalizeUserId(winnerId) : null;
      const normalizedWhitePlayerId = normalizeUserId(whitePlayerId);
      const normalizedBlackPlayerId = normalizeUserId(blackPlayerId);
      const resolvedWinnerId = (reason === 'draw' || reason === 'stalemate') ? null : normalizedWinnerId;
      
      if (normalizedWhitePlayerId && normalizedBlackPlayerId) {
        updateEloAfterGame(resolvedWinnerId, normalizedWhitePlayerId, normalizedBlackPlayerId).catch(() => {});
      }
    } catch {}
  };

  // Debug spectator state periodically
  useEffect(() => {
    if (isSpectator) {
      const interval = setInterval(() => {
        console.log('👁️ Spectator debug state:', {
          isSpectator,
          gameId,
          whitePlayer: whitePlayer?.username,
          blackPlayer: blackPlayer?.username,
          whitePlayerId,
          blackPlayerId,
          gameState: gameState?.gameId,
          gameEnded,
          gameOverModal
        });
      }, 5000); // Log every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [isSpectator, gameId, whitePlayer?.username, blackPlayer?.username, whitePlayerId, blackPlayerId, gameState?.gameId, gameEnded, gameOverModal]);

  // Note: Loading state logic removed since spectators now show "Your Friend" or "Opponent"

  // Elo calculation & update (spectator-safe) - keeping existing logic
  const getKFactor = (rating, gamesPlayed) => {
    if (gamesPlayed < 20) return 32;
    if (rating >= 2400) return 10;
    return 20;
  };

  const expectedScore = (rating, opponentRating) => 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));

  const computeNewRating = (rating, opponentRating, score, gamesPlayed) => {
    const K = getKFactor(rating, gamesPlayed);
    const E = expectedScore(rating, opponentRating);
    return Math.round(rating + K * (score - E));
  };

  const updateEloAfterGame = async (winnerId, whiteId, blackId) => {
    const token = authTokenRef.current;
    if (!token) return;

    try {
      // fetch both players from backend
      const [wRes, bRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${whiteId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axios.get(`${API_URL}/api/users/${blackId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);

      if (!wRes?.data || !bRes?.data) return;

      const white = wRes.data;
      const black = bRes.data;

      const whiteRating = Number(white.elo ?? 1200);
      const blackRating = Number(black.elo ?? 1200);
      const whiteGames = Number(white.gamesPlayed ?? 0);
      const blackGames = Number(black.gamesPlayed ?? 0);

      let whiteScore, blackScore;
      if (winnerId === null) {
        whiteScore = 0.5; blackScore = 0.5;
      } else if (winnerId === whiteId) {
        whiteScore = 1; blackScore = 0;
      } else if (winnerId === blackId) {
        whiteScore = 0; blackScore = 1;
      } else {
        return;
      }

      const newWhiteRating = computeNewRating(whiteRating, blackRating, whiteScore, whiteGames);
      const newBlackRating = computeNewRating(blackRating, whiteRating, blackScore, blackGames);

      const updatedWhiteGames = whiteGames + 1;
      const updatedBlackGames = blackGames + 1;

      // patch both users on backend
      const patchPromises = [
        axios.patch(`${API_URL}/api/users/${whiteId}`, { 
          elo: newWhiteRating, 
          gamesPlayed: updatedWhiteGames 
        }, { 
          headers: { Authorization: `Bearer ${token}` } 
        }).catch(() => null),
        axios.patch(`${API_URL}/api/users/${blackId}`, { 
          elo: newBlackRating, 
          gamesPlayed: updatedBlackGames 
        }, { 
          headers: { Authorization: `Bearer ${token}` } 
        }).catch(() => null),
      ];

      await Promise.all(patchPromises);

      // Optimistic local updates — but DO NOT update if spectator
      const normalizedUid = normalizeUserId(uid);
      const normalizedFriendId = normalizeUserId(friendId);
      
      if (!isSpectator) {
        if (whiteId === normalizedUid) {
          setUser((u) => u ? { ...u, elo: newWhiteRating, gamesPlayed: updatedWhiteGames } : u);
        } else if (blackId === normalizedUid) {
          setUser((u) => u ? { ...u, elo: newBlackRating, gamesPlayed: updatedBlackGames } : u);
        }

        if (whiteId === normalizedFriendId) {
          setFriend((f) => f ? { ...f, elo: newWhiteRating, gamesPlayed: updatedWhiteGames } : f);
        } else if (blackId === normalizedFriendId) {
          setFriend((f) => f ? { ...f, elo: newBlackRating, gamesPlayed: updatedBlackGames } : f);
        }
      }

      // Update spectator-visible player objects
      setWhitePlayer((p) => p && p.id === whiteId ? { ...p, elo: newWhiteRating, gamesPlayed: updatedWhiteGames } : p);
      setBlackPlayer((p) => p && p.id === blackId ? { ...p, elo: newBlackRating, gamesPlayed: updatedBlackGames } : p);

    } catch (err) {
      // swallow errors — Elo updates must not break game flow
      console.warn('Elo update failed', err);
    }
  };

  const cleanup = () => {
    // Don't disconnect the socket completely, just leave the game
    if (socketRef.current && gameState?.gameId) {
      if (isSpectator) {
        socketRef.current.emit('leaveSpectator', { gameId: normalizeUserId(gameState.gameId) });
      } else {
        socketRef.current.emit('leaveGame', { gameId: normalizeUserId(gameState.gameId) });
      }
    }
    clearInterval(gameTimerRef.current);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    stopConnectionMonitor();
  };

  const formatTime = (seconds) => {
    if (mode === 'unlimited') return '∞';
    if (seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const isUserPiece = (row, col) => {
    const piece = gameState?.board?.[row]?.[col];
    if (!piece) return false;
    const isWhite = piece.toUpperCase() === piece;
    return (userColor === 'white' && isWhite) || (userColor === 'black' && !isWhite);
  };

  const handleSquarePress = (row, col) => {
    if (!gameState || loading || (gameState.status !== 'ongoing' && gameState.status !== 'check')) return;
    if (isSpectator) return;

    if (!socketRef.current || !socketRef.current.connected) {
      showErrorMessage('Not connected to game server');
      return;
    }

    const isUserTurn = (currentTurn || 'white') === userColor;
    if (!isUserTurn) {
      shakeAnimation();
      showErrorMessage('Not your turn');
      return;
    }

    if (!selectedSquare) {
      if (gameState.board[row][col] && isUserPiece(row, col)) {
        setSelectedSquare({ row, col });
      }
    } else {
      if (selectedSquare.row === row && selectedSquare.col === col) {
        setSelectedSquare(null);
        return;
      }

      // Allow switching to another of your pieces
      if (gameState.board[row][col] && isUserPiece(row, col)) {
        setSelectedSquare({ row, col });
        return;
      }

      // Validate move with local chess.js before sending to server
      const fromSquare = toAlgebraic(selectedSquare.row, selectedSquare.col);
      const toSquare = toAlgebraic(row, col);
      
      try {
        // Create a copy of the current chess position for validation
        const testChess = new Chess(localChess.fen());
        const moveResult = testChess.move({ from: fromSquare, to: toSquare });
        
        if (!moveResult) {
          console.log('❌ Invalid move attempted:', { from: fromSquare, to: toSquare });
          showErrorMessage('Invalid move');
          shakeAnimation();
          return;
        }
        
        console.log('✅ Move validated locally:', moveResult.san);
        
        // Play sound immediately for user's move using the validated move result
        console.log('🎵 Playing sound for user move:', moveResult.san);
        playMoveSound({
          captured: moveResult.captured,
          castle: moveResult.flags.includes('k') || moveResult.flags.includes('q'),
          promotion: moveResult.flags.includes('p'),
          check: moveResult.san.includes('+'),
        });
        
        // Set flag to indicate this was user's move (to skip sound in gameUpdate)
        setLastMoveWasUser(true);
      } catch (error) {
        console.error('❌ Move validation error:', error);
        globalErrorHandler.handleGameError(error);
        showErrorMessage('Invalid move');
        shakeAnimation();
        return;
      }

      // Send move to server
      const moveData = {
        gameId: gameState.gameId,
        from: { row: selectedSquare.row, col: selectedSquare.col },
        to: { row, col },
        userId: normalizeUserId(uid),
      };

      console.log('📤 Sending move:', moveData);

      socketRef.current.emit('move', moveData, (ack) => {
        console.log('📥 Move response:', ack);
        if (ack && !ack.ok) {
          showErrorMessage(ack.error || 'Invalid move');
          shakeAnimation();
          setLastMoveWasUser(false); // Reset flag on error
        }
      });

      setSelectedSquare(null);
    }
  };

  const renderSquare = (row, col) => {
    const piece = gameState?.board?.[row]?.[col] || '';
    const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
    const isUserPieceHighlight = piece && isUserPiece(row, col);
    const isLight = (row + col) % 2 === 0;
    const isKingInCheckSquare = kingInCheck && kingInCheck.row === row && kingInCheck.col === col;

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        onPress={() => handleSquarePress(row, col)}
        disabled={loading || (gameState?.status !== 'ongoing' && gameState?.status !== 'check') || isSpectator}
        activeOpacity={0.8}
        style={[
          styles.square,
          { 
            width: squareSize,
            height: squareSize,
            backgroundColor: isLight ? BOARD_COLORS.light : BOARD_COLORS.dark 
          },
          isSelected && styles.selectedSquare,
          isUserPieceHighlight && styles.userPieceOutline,
          isKingInCheckSquare && styles.kingInCheckSquare,
        ]}
      >
        {piece ? (
          <Image 
            source={pieceImages[piece]} 
            style={[styles.pieceImage, { 
              width: squareSize * 0.9, 
              height: squareSize * 0.9 
            }]} 
          />
        ) : null}
      </TouchableOpacity>
    );
  };

  // Update local chess.js instance with server board state
  const updateLocalChess = (board, turn) => {
    try {
      const newChess = new Chess();
      
      // Convert board array to FEN format
      let fen = '';
      for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece) {
            if (emptyCount > 0) {
              fen += emptyCount;
              emptyCount = 0;
            }
            fen += piece;
          } else {
            emptyCount++;
          }
        }
        if (emptyCount > 0) {
          fen += emptyCount;
        }
        if (row < 7) fen += '/';
      }
      
      // Add turn and other FEN components
      const turnChar = turn === 'white' ? 'w' : 'b';
      const fullFen = `${fen} ${turnChar} - - 0 1`;
      
      newChess.load(fullFen);
      setLocalChess(newChess);
      
      console.log('🔄 Updated local chess instance:', fullFen);
    } catch (error) {
      console.error('❌ Failed to update local chess:', error);
    }
  };

  const findKingInCheck = (board, turn, status) => {
    if (!board) return null;
    
    // Find the king of the current turn
    const currentTurnColor = turn === 'white' ? 'w' : 'b';
    const kingPiece = currentTurnColor === 'w' ? 'K' : 'k';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece === kingPiece) {
          // Check if this king is in check by looking at the game state
          if (status === 'check' || status === 'checkmate') {
            return { row, col };
          }
        }
      }
    }
    return null;
  };

  const calculateCapturedPieces = () => {
    const currentPieces = { white: [], black: [] };
    const board = gameState?.board;

    if (!board) {
      console.log('No board data available for captured pieces calculation');
      return { white: [], black: [] };
    }

    // Count current pieces on the board
    board.forEach(row => {
      row.forEach(piece => {
        if (piece) {
          // In multiplayer, pieces are stored as strings (e.g., 'P', 'p', 'R', 'r', etc.)
          if (piece === piece.toUpperCase()) {
            // Uppercase pieces are white
            currentPieces.white.push(piece);
          } else {
            // Lowercase pieces are black
            currentPieces.black.push(piece);
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

    console.log('Multiplayer captured pieces calculation:');
    console.log('Board data:', board);
    console.log('Current white pieces on board:', currentPieces.white);
    console.log('Current black pieces on board:', currentPieces.black);
    console.log('Missing white pieces (captured by black):', capturedWhite);
    console.log('Missing black pieces (captured by white):', capturedBlack);
    console.log('Final result - White player captured:', capturedBlack);
    console.log('Final result - Black player captured:', capturedWhite);

    return {
      white: capturedBlack, // White player captured black pieces (show black piece images)
      black: capturedWhite, // Black player captured white pieces (show white piece images)
    };
  };

  const renderBoard = () => {
    const nodes = [];
    const boardToRender = isBoardFlipped
      ? gameState?.board?.slice().reverse().map((r) => r.slice().reverse())
      : gameState?.board;

    if (!boardToRender) return null;

    for (let row = 0; row < 8; row++) {
      const rowSquares = [];
      for (let col = 0; col <= 7; col++) {
        const actualRow = isBoardFlipped ? 7 - row : row;
        const actualCol = isBoardFlipped ? 7 - col : col;
        rowSquares.push(renderSquare(actualRow, actualCol));
      }

      nodes.push(
        <View key={row} style={styles.boardRow}>
          {rowSquares}
        </View>
      );
    }

    return nodes;
  };

  const renderCapturedPieces = (pieces, label) => {
    return (
      <View style={[styles.capturedSection, { padding: getResponsiveSpacing(10) }]}>
        <Text style={[styles.capturedLabel, { fontSize: getResponsiveFontSize(10) }]}>{label}</Text>
        <FlatList
          data={pieces || []}
          horizontal
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <Image 
              source={pieceImages[item]} 
              style={[styles.capturedPiece, { 
                width: Math.max(20, squareSize * 0.4), 
                height: Math.max(20, squareSize * 0.4) 
              }]} 
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.capturedList}
          ListEmptyComponent={() => (
            <Text style={[styles.noCapturedText, { fontSize: getResponsiveFontSize(10) }]}>None</Text>
          )}
        />
      </View>
    );
  };

  const renderPlayerInfo = (playerLike, colorLabel, timeLeft) => {
    const validColorLabel = colorLabel === 'white' || colorLabel === 'black' ? colorLabel : 'unknown';
    const isPlayerTurn = (currentTurn || 'white') === validColorLabel;
    const displayName = playerLike?.username || spectatorFriendName || (validColorLabel === 'white' ? 'White' : validColorLabel === 'black' ? 'Black' : 'Unknown');
    const initial = displayName[0]?.toUpperCase() || validColorLabel?.toUpperCase() || 'U';
    const isCurrentPlayer = (validColorLabel === userColor);
    const isTopPlayer = validColorLabel === (isSpectator ? 'black' : (userColor === 'white' ? 'black' : 'white'));
    const showCaptured = isTopPlayer ? showTopCaptured : showBottomCaptured;
    const capturedPieces = isTopPlayer ? topCaptured : bottomCaptured;
    const capturedLabel = isTopPlayer 
      ? `Captured by ${isSpectator ? 'Black' : (userColor === 'white' ? 'Opponent' : 'You')}`
      : `Captured by ${isSpectator ? 'White' : (userColor === 'white' ? 'You' : 'Opponent')}`;

    return (
      <TouchableOpacity 
        onPress={() => {
          clickSoundContext?.playClick?.();
          if (isTopPlayer) {
            setShowTopCaptured(!showTopCaptured);
          } else {
            setShowBottomCaptured(!showBottomCaptured);
          }
        }}
      >
      <LinearGradient 
        colors={['#1A1A1A', '#2A2A2A']} 
        style={styles.playerCard}
      >
          {!showCaptured ? (
            <>
        <View style={styles.playerInfo}>
          <View style={styles.playerAvatar}>
            {playerLike?.profile_picture ? (
              <Image 
                source={{ uri: `${API_URL}${playerLike.profile_picture}` }} 
                style={styles.playerAvatar} 
              />
            ) : (
              <View style={styles.playerAvatarPlaceholder}>
                <Text style={styles.playerAvatarText}>{initial}</Text>
              </View>
            )}
            
          </View>

          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>
              {displayName} ({validColorLabel})
            </Text>
            <Text style={styles.playerStatus}>
              {isSpectator
                ? (isPlayerTurn ? 'Playing' : 'Waiting...')
                : (isPlayerTurn ? 'Your turn' : 'Waiting...')
              }
            </Text>
            {playerLike?.elo && (
              <Text style={styles.playerElo}>
                Rating: {playerLike.elo}
              </Text>
            )}
          </View>
        </View>

        {isSpectator ? (
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: '#4ECDC4' }]}>
              {String(mode || 'game').toUpperCase()}
            </Text>
          </View>
        ) : (
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, timeLeft < 30 && styles.urgentTimer]}>
            {formatTime(timeLeft || 0)}
          </Text>
        </View>
        )}
            </>
          ) : (
            <View style={styles.capturedPiecesContainer}>
              <View style={styles.capturedHeader}>
                <Text style={[styles.capturedLabel, { fontSize: getResponsiveFontSize(12) }]}>{capturedLabel}</Text>
                {isSpectator ? (
                  <View style={[styles.timerContainer, { paddingHorizontal: getResponsiveSpacing(8), paddingVertical: getResponsiveSpacing(4) }]}>
                    <Text style={[styles.timerText, { color: '#4ECDC4', fontSize: getResponsiveFontSize(12) }]}>
                      {String(mode || 'game').toUpperCase()}
                    </Text>
                  </View>
                ) : (mode || 'classic') !== 'unlimited' && (
                  <View style={[styles.timerContainer, { paddingHorizontal: getResponsiveSpacing(8), paddingVertical: getResponsiveSpacing(4) }]}>
                    <Text style={[styles.timerText, timeLeft < 30 && styles.urgentTimer, { fontSize: getResponsiveFontSize(12) }]}>
                      {formatTime(timeLeft || 0)}
                    </Text>
                  </View>
                )}
              </View>
              <FlatList
                data={capturedPieces || []}
                horizontal
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <Image 
                    source={pieceImages[item]} 
                    style={[styles.capturedPiece, { 
                      width: Math.max(20, squareSize * 0.4), 
                      height: Math.max(20, squareSize * 0.4) 
                    }]} 
                  />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.capturedList}
                ListEmptyComponent={() => (
                  <Text style={[styles.noCapturedText, { fontSize: getResponsiveFontSize(10) }]}>None</Text>
                )}
              />
            </View>
          )}
      </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderConnectionStatus = () => {
    const statusConfig = {
      connecting: { icon: 'wifi', color: '#FFA500', text: 'Connecting...' },
      connected: { icon: 'wifi', color: '#4ECDC4', text: 'Connected' },
      disconnected: { icon: 'wifi-off', color: '#FF6B6B', text: 'Disconnected' },
      error: { icon: 'wifi-off', color: '#FF6B6B', text: 'Connection Error' },
      timeout: { icon: 'time', color: '#FF6B6B', text: 'Connection Timeout' },
    };

    const config = statusConfig[connectionStatus] || statusConfig.error;

    return (
      <View style={styles.connectionStatus}>
        <View style={[styles.connectionDot, { backgroundColor: config.color }]} />
        <Text style={[styles.connectionText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  // chat handlers
  const openInGameChat = async () => {
    try {
      setChatVisible(true);
      const t = authTokenRef.current;
      const normalizedFriendId = normalizeUserId(friendId);
      
      if (t && normalizedFriendId) {
        const res = await axios.get(`${API_URL}/api/chat/history/${normalizedFriendId}`, { 
          headers: { Authorization: `Bearer ${t}` } 
        });
        setChatMessages(res.data.messages || []);
        socketRef.current?.emit('joinChat', { friendId: normalizedFriendId });
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      showErrorMessage('Failed to load chat history');
    }
  };

  const sendInGameChat = () => {
    if (!chatInput.trim() || !friendId) return;

    const normalizedUid = normalizeUserId(uid);
    const normalizedFriendId = normalizeUserId(friendId);
    const tempId = Date.now();
    
    const optimistic = {
      id: tempId,
      senderId: normalizedUid,
      receiverId: normalizedFriendId,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
      senderUsername: user?.username || 'You',
    };

    setChatMessages((prev) => [...prev, optimistic]);

    if (socketRef.current) {
      socketRef.current.emit('sendChat', { 
        toUserId: normalizedFriendId, 
        message: chatInput.trim(), 
        tempId 
      }, (ack) => {
        if (!ack?.ok) {
          showErrorMessage(ack?.error || 'Send failed');
          // Remove optimistic message on failure
          setChatMessages((prev) => prev.filter(msg => msg.id !== tempId));
        }
      });
    }

    setChatInput('');
  };

  const closeInGameChat = () => {
    socketRef.current?.emit('leaveChat', { friendId: normalizeUserId(friendId) });
    setChatVisible(false);
  };

  if (loading || (!userColor && !isSpectator)) {
    return (
      <LinearGradient colors={['#0F0F0F', '#1A1A1A']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>
          {isSpectator ? 'Joining as spectator...' : 'Setting up your game...'}
        </Text>
        <Text style={styles.loadingSubtext}>
          {connectionStatus === 'connecting' ? 'Connecting…' :
           connectionStatus === 'error' ? 'Connection failed' :
           'Loading...'}
        </Text>
        {connectionStatus === 'error' && (
          <TouchableOpacity
            onPress={() => {
              clickSoundContext?.playClick?.();
              if (socketRef.current) {
                socketRef.current.connect();
              }
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry Connection</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  }

  const topCard = isSpectator ? (blackPlayer ?? {}) : (friend ?? {});
  const bottomCard = isSpectator ? (whitePlayer ?? {}) : (user ?? {});
  const topCaptured = isSpectator ? capturedPieces.white : (userColor === 'white' ? capturedPieces.black : capturedPieces.white);
  const bottomCaptured = isSpectator ? capturedPieces.black : capturedPieces[userColor];
  
  console.log('Multiplayer captured pieces debug:');
  console.log('capturedPieces:', capturedPieces);
  console.log('topCaptured:', topCaptured);
  console.log('bottomCaptured:', bottomCaptured);
  console.log('isSpectator:', isSpectator);
  console.log('userColor:', userColor);
  console.log('showTopCaptured:', showTopCaptured);
  console.log('showBottomCaptured:', showBottomCaptured);
  console.log('gameState?.board:', gameState?.board);
  

  return (
    <Animated.View style={[
      styles.container,
      { 
        opacity: fadeAnim, 
        transform: [
          { translateY: slideAnim }, 
          { scale: scaleAnim },
          { translateX: shakeAnim }
        ] 
      }
    ]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" hidden translucent />

      {/* Responsive Header */}
      <View style={[styles.header, { height: getResponsiveSpacing(70) }]}>
          <TouchableOpacity 
            onPress={() => {
              clickSoundContext?.playClick?.();
            if (isSpectator) {
              // Spectator: go back directly
              socketRef.current?.emit('leaveSpectator', { gameId: normalizeUserId(gameId) }); 
              router.back(); 
            } else {
              // Player: show forfeit modal
              handleForfeit();
            }
            }} 
            style={[styles.backButton, { width: getResponsiveSpacing(40), height: getResponsiveSpacing(40) }]}
          >
            <Ionicons name="arrow-back" size={getResponsiveFontSize(20)} color="#4ECDC4" />
          </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.gameMode, { fontSize: getResponsiveFontSize(18) }]}>
            {String(mode ?? 'game').toUpperCase()}
          </Text>
          {renderConnectionStatus()}
        </View>

        {/* DEBUG: Test timeout modal button */}
        <TouchableOpacity 
          onPress={() => {
            console.log('🧪 DEBUG: Testing timeout modal');
            handleGameEnd('timeout', null, 'white');
          }} 
          style={[styles.headerButton, { backgroundColor: '#FF4444' }]}
        >
          <Text style={[styles.backButtonText, { color: '#FFFFFF', fontSize: 10 }]}>Test</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {connectionStatus === 'error' && (
            <TouchableOpacity
              onPress={() => {
                clickSoundContext?.playClick?.();
                if (socketRef.current) {
                  socketRef.current.connect();
                }
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}


          {/* Moves modal toggle */}
          <TouchableOpacity 
            onPress={() => {
              clickSoundContext?.playClick?.();
              setShowMoves(!showMoves);
            }} 
            style={styles.movesButton}
          >
            <Feather name="list" size={20} color="#4ECDC4" />
          </TouchableOpacity>

          {/* Chat button */}
          {!isSpectator && (
            <TouchableOpacity 
              onPress={() => {
                clickSoundContext?.playClick?.();
                openInGameChat();
              }} 
              style={styles.movesButton}
            >
              <MaterialCommunityIcons name="message-text" size={20} color="#4ECDC4" />
            </TouchableOpacity>
          )}

    

        </View>
      </View>

      {/* Top player */}
      {renderPlayerInfo(topCard, isSpectator ? 'black' : (userColor === 'white' ? 'black' : 'white'), 
        // For top player: show opponent's time
        isSpectator ? blackTime : (userColor === 'white' ? blackTime : whiteTime)
      )}


      {/* Responsive Board */}
      <View style={[styles.boardSection, { flex: 1, minHeight: squareSize * 8 + 20 }]}>
        <View style={[styles.chessboardContainer, { 
          width: squareSize * 8 + 12, 
          height: squareSize * 8 + 12,
          padding: 6 
        }]}>
          {renderBoard()}
        </View>
        
        
      </View>


      {/* Bottom player */}
      {renderPlayerInfo(bottomCard, isSpectator ? 'white' : userColor, 
        // For bottom player: show your time
        isSpectator ? whiteTime : (userColor === 'white' ? whiteTime : blackTime)
      )}


      {/* Game controls */}
      {!isSpectator && (
        <View style={styles.gameControls}>
          <TouchableOpacity 
            onPress={() => {
              clickSoundContext?.playClick?.();
              handleForfeit();
            }} 
            style={styles.forfeitButton}
          >
            <Text style={styles.forfeitText}>Forfeit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {error ? (
        <View style={styles.errorMessage}>
          <Text style={styles.errorText}>
            {error}
            {isDisconnected && reconnectCountdown > 0 && (
              <Text style={styles.countdownText}>
                {'\n'}Game ending in: {reconnectCountdown}s
              </Text>
            )}
          </Text>
        </View>
      ) : null}

      {/* Moves modal */}
      <Modal 
        visible={showMoves} 
        animationType="slide" 
        transparent 
        onRequestClose={() => {
          clickSoundContext?.playClick?.();
          setShowMoves(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.movesModal}>
            <View style={styles.movesHeader}>
              <Text style={styles.movesTitle}>Move History</Text>
              <TouchableOpacity 
                onPress={() => {
                  clickSoundContext?.playClick?.();
                  setShowMoves(false);
                }}
              >
                <Ionicons name="close" size={24} color="#4ECDC4" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.movesList}>
              {moves.length === 0 ? (
                <Text style={styles.noMovesText}>No moves yet</Text>
              ) : (
                moves.map((move, index) => (
                  <Text key={index} style={styles.moveText}>
                    {`${Math.floor(index / 2) + 1}. ${move}`}
                  </Text>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Chat modal */}
      <Modal 
        visible={chatVisible} 
        animationType="slide" 
        transparent 
        onRequestClose={() => {
          clickSoundContext?.playClick?.();
          closeInGameChat();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.movesModal}>
            <View style={styles.movesHeader}>
              <Text style={styles.movesTitle}>Chat</Text>
              <TouchableOpacity 
                onPress={() => {
                  clickSoundContext?.playClick?.();
                  closeInGameChat();
                }}
              >
                <Ionicons name="close" size={24} color="#4ECDC4" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={chatMessages}
              keyExtractor={(m) => String(m.id)}
              renderItem={({ item }) => (
                <View style={{
                  padding: 10,
                  backgroundColor: normalizeUserId(item.senderId) === normalizeUserId(uid) ? '#333' : '#1a1a1a',
                  marginVertical: 2,
                  borderRadius: 8,
                  alignSelf: normalizeUserId(item.senderId) === normalizeUserId(uid) ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>{item.message}</Text>
                  <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              )}
              contentContainerStyle={{ padding: 10 }}
            />
            
            <View style={{ flexDirection: 'row', padding: 10, alignItems: 'center' }}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type message..."
                placeholderTextColor="#666"
                style={{
                  flex: 1,
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  padding: 12,
                  borderRadius: 10,
                  marginRight: 8
                }}
                onSubmitEditing={sendInGameChat}
              />
              <TouchableOpacity 
                onPress={() => {
                  clickSoundContext?.playClick?.();
                  sendInGameChat();
                }} 
                style={{ 
                  width: 44, 
                  height: 44, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  backgroundColor: '#333', 
                  borderRadius: 10 
                }}
              >
                <Ionicons name="send" size={20} color="#4ECDC4" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhanced Game Over Modal with Animation */}
      <Modal 
        visible={gameOverModal || gameOverModalRef.current}
        animationType="fade" 
        transparent={true}
        onRequestClose={() => {
          clickSoundContext?.playClick?.();
          setGameOverModal(false);
          gameOverModalRef.current = false;
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverModal}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverMessage}>
              {gameOverMessage}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                clickSoundContext?.playClick?.();
                setGameOverModal(false);
                gameOverModalRef.current = false;
                handleConfirmExit();
              }} 
              style={styles.gameOverButton}
            >
              <Text style={styles.gameOverButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal 
        visible={exitModalVisible} 
        animationType="fade" 
        transparent 
        onRequestClose={() => {
          clickSoundContext?.playClick?.();
          setExitModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverModal}>
            <Text style={styles.gameOverTitle}>Leave Game?</Text>
            <Text style={styles.gameOverMessage}>Are you sure you want to leave this game?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                onPress={() => {
                  clickSoundContext?.playClick?.();
                  handleConfirmExit();
                }} 
                style={[styles.gameOverButton, { backgroundColor: '#AA0000', marginRight: 10 }]}
              >
                <Text style={styles.gameOverButtonText}>Yes, Leave</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  clickSoundContext?.playClick?.();
                  handleCancelExit();
                }} 
                style={[styles.gameOverButton, { backgroundColor: '#333333' }]}
              >
                <Text style={styles.gameOverButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Forfeit Confirmation Modal */}
      <Modal 
        visible={forfeitModalVisible} 
        animationType="fade" 
        transparent 
        onRequestClose={() => {
          clickSoundContext?.playClick?.();
          setForfeitModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverModal}>
            <Text style={styles.gameOverTitle}>Forfeit Game?</Text>
            <Text style={styles.gameOverMessage}>Are you sure you want to forfeit this game? This will end the game and give your opponent the win.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                onPress={() => {
                  clickSoundContext?.playClick?.();
                  handleConfirmForfeit();
                }} 
                style={[styles.gameOverButton, { backgroundColor: '#FF6B6B', marginRight: 10 }]}
              >
                <Text style={styles.gameOverButtonText}>Yes, Forfeit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  clickSoundContext?.playClick?.();
                  handleCancelForfeit();
                }} 
                style={[styles.gameOverButton, { backgroundColor: '#333333' }]}
              >
                <Text style={styles.gameOverButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

// Styles remain the same as original
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F', paddingTop: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F0F' },
  loadingText: { color: '#FFFFFF', fontSize: 18, marginTop: 20, fontWeight: '600' },
  loadingSubtext: { color: '#AAAAAA', fontSize: 14, marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333333' },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  headerCenter: { alignItems: 'center' },
  gameMode: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  connectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  connectionText: { fontSize: 12, marginLeft: 4, fontWeight: '500' },
  retryButton: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#333', borderRadius: 4 },
  retryText: { color: '#4ECDC4', fontSize: 10, fontWeight: '600' },
  movesButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333333', marginLeft: 8 },
  playerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 15, marginVertical: 8, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#333333' },
  playerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  playerAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#555555' },
  playerAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#555555' },
  playerAvatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  playerDetails: { marginLeft: 15, flex: 1 },
  playerName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  playerStatus: { color: '#AAAAAA', fontSize: 12, marginTop: 2 },
  playerElo: { color: '#4ECDC4', fontSize: 10, marginTop: 2 },
  timerContainer: { backgroundColor: '#333333', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#555555' },
  timerText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', minWidth: 50, textAlign: 'center' },
  urgentTimer: { color: '#FF6B6B' },
  capturedSection: { marginHorizontal: 15, marginVertical: 5, padding: 10, backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: '#333333' },
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
    marginBottom: 8,
  },
  capturedLabel: { color: '#AAAAAA', fontSize: 12, textAlign: 'center', flex: 1 },
  capturedList: { paddingHorizontal: 5 },
  capturedPiece: { marginHorizontal: 2 },
  noCapturedText: { color: '#666666', fontSize: 10, fontStyle: 'italic', textAlign: 'center', paddingVertical: 6 },
  boardSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  chessboardContainer: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 6, borderWidth: 2, borderColor: '#333333' },
  boardRow: { flexDirection: 'row' },
  square: { alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  selectedSquare: { backgroundColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 2, borderColor: '#FFFFFF' },
  userPieceOutline: { borderWidth: 2, borderColor: '#AAAAAA' },
  kingInCheckSquare: { backgroundColor: '#AA0000' },
  pieceImage: { resizeMode: 'contain', zIndex: 2 },
  gameControls: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 },
  forfeitButton: { backgroundColor: '#AA0000', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#333333' },
  forfeitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  errorMessage: { backgroundColor: '#AA0000', marginHorizontal: 15, marginVertical: 5, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333333' },
  errorText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  countdownText: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  movesModal: { width: '80%', maxHeight: '60%', backgroundColor: '#1A1A1A', borderRadius: 20, borderWidth: 1, borderColor: '#333333' },
  movesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333333' },
  movesTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  movesList: { padding: 20 },
  noMovesText: { color: '#AAAAAA', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
  moveText: { color: '#FFFFFF', fontSize: 14, marginVertical: 2 },
  gameOverModal: { width: '80%', backgroundColor: '#1A1A1A', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  gameOverTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  gameOverMessage: { color: '#AAAAAA', fontSize: 16, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  loadingText: { color: '#4ECDC4', fontSize: 16 },
  timeoutDetails: {
    color: '#FFA500',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic'
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  gameOverButton: { backgroundColor: '#333333', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#555555' },
  gameOverButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
