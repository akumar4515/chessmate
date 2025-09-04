// chessMulti.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TextInput, // NEW
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');
const BOARD_SIZE = Math.min(width * 0.9, height * 0.45);
const SQUARE_SIZE = BOARD_SIZE / 8;

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

export default function ChessMultiRedesigned() {
  // players (local and opponent)
  const [user, setUser] = useState(null);
  const [friend, setFriend] = useState(null);
  // spectator: players
  const [whitePlayer, setWhitePlayer] = useState(null);
  const [blackPlayer, setBlackPlayer] = useState(null);

  // game state
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

  // captured
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });

  // voice chat
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [audioPermission, setAudioPermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [friendIsTalking, setFriendIsTalking] = useState(false);

  // sfx
  const [moveSound, setMoveSound] = useState(null);
  const [captureSound, setCaptureSound] = useState(null);
  const [castleSound, setCastleSound] = useState(null);
  const [checkSound, setCheckSound] = useState(null);
  const [gameStartSound, setGameStartSound] = useState(null);
  const [gameEndSound, setGameEndSound] = useState(null);

  // colors and ids
  const [userColor, setUserColor] = useState(null);
  const [whitePlayerId, setWhitePlayerId] = useState(null);
  const [blackPlayerId, setBlackPlayerId] = useState(null);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);

  // chat modal (NEW)
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // anim
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const route = useRoute();
  const navigation = useNavigation();

  const params = route?.params ?? {};
  const {
    mode,
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
  const userTimerRef = useRef(null);
  const friendTimerRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const authTokenRef = useRef(null);

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

  // sounds
  useEffect(() => {
    loadSounds();
    return () => unloadSounds();
  }, []);

  const loadSounds = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });
      const soundPromises = [
        Audio.Sound.createAsync(require('../assets/sounds/move.mp3'), { volume: 0.7 }),
        Audio.Sound.createAsync(require('../assets/sounds/capture.mp3'), { volume: 0.8 }),
        Audio.Sound.createAsync(require('../assets/sounds/castle.mp3'), { volume: 0.7 }),
        Audio.Sound.createAsync(require('../assets/sounds/move-check.mp3'), { volume: 0.9 }),
        Audio.Sound.createAsync(require('../assets/sounds/game-start.mp3'), { volume: 0.6 }),
        Audio.Sound.createAsync(require('../assets/sounds/game-end.mp3'), { volume: 0.8 }),
      ];
      const results = await Promise.allSettled(soundPromises);
      const [move, capture, castle, check, gameStart, gameEnd] = results.map(r => (r.status === 'fulfilled' ? r.value.sound : null));
      setMoveSound(move);
      setCaptureSound(capture);
      setCastleSound(castle);
      setCheckSound(check);
      setGameStartSound(gameStart);
      setGameEndSound(gameEnd);
    } catch (e) {
      // ignore
    }
  };

  const unloadSounds = async () => {
    await Promise.all([
      moveSound?.unloadAsync(),
      captureSound?.unloadAsync(),
      castleSound?.unloadAsync(),
      checkSound?.unloadAsync(),
      gameStartSound?.unloadAsync(),
      gameEndSound?.unloadAsync(),
    ]);
  };

  const playSound = async (sound) => {
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch {}
  };

  // voice permission
  useEffect(() => { setupAudioPermissions(); }, []);
  const setupAudioPermissions = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      setAudioPermission(permission.granted);
      if (permission.granted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch {}
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
    setError(message);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
  };

  const loadPlayersById = useCallback(async (wId, bId) => {
    try {
      const t = authTokenRef.current;
      const [w, b] = await Promise.all([
        axios.get(`${API_URL}/api/users/${wId}`, { headers: { Authorization: `Bearer ${t}` } }).catch(() => ({ data: { username: 'Unknown White', id: wId } })),
        axios.get(`${API_URL}/api/users/${bId}`, { headers: { Authorization: `Bearer ${t}` } }).catch(() => ({ data: { username: 'Unknown Black', id: bId } })),
      ]);
      setWhitePlayer(w.data);
      setBlackPlayer(b.data);
    } catch {
      setWhitePlayer({ username: 'Unknown White', id: wId });
      setBlackPlayer({ username: 'Unknown Black', id: bId });
    }
  }, []);

  // bootstrap
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const token = await AsyncStorage.getItem('token');
        authTokenRef.current = token;
        if (!token) throw new Error('No authentication token found');
        if (!uid || !gameId || (isSpectator && !friendId)) throw new Error('Missing required route parameters');

        // preload users for non-spectator
        if (!isSpectator) {
          const [userResponse, friendResponse] = await Promise.all([
            axios.get(`${API_URL}/api/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { username: 'Unknown User', id: uid } })),
            axios.get(`${API_URL}/api/users/${friendId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { username: 'Unknown Opponent', id: friendId } })),
          ]);
          if (!mounted) return;
          setUser(userResponse.data);
          setFriend(friendResponse.data);
        }

        if (routeWhitePlayerId && routeBlackPlayerId) {
          setWhitePlayerId(routeWhitePlayerId);
          setBlackPlayerId(routeBlackPlayerId);
          const userIsWhite = routeWhitePlayerId === uid;
          setUserColor(userIsWhite ? 'white' : 'black');
          setIsBoardFlipped(!userIsWhite);
          if (isSpectator) await loadPlayersById(routeWhitePlayerId, routeBlackPlayerId);
        } else if (!isSpectator) {
          setWhitePlayerId(uid);
          setBlackPlayerId(friendId);
          setUserColor('white');
        } else {
          setWhitePlayer({ username: 'Unknown White' });
          setBlackPlayer({ username: 'Unknown Black' });
        }

        setGameState({
          board: initialBoard,
          gameId: gameId || `game_${Date.now()}`,
          turn: 'white',
          status: 'ongoing',
        });
        setUserTime(initialTime || 600);
        setFriendTime(initialTime || 600);

        await initializeSocket(token);
      } catch (err) {
        showErrorMessage(err.message || 'Failed to start game. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      cleanup();
    };
  }, [isSpectator, loadPlayersById]);

  // voice recording
  const startRecording = async () => {
    if (!audioPermission || isSpectator) return;
    try {
      if (recording) await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
        },
      });
      newRecording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          // optional streaming (not persisted on server)
        }
      });
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setTimeout(() => { if (newRecording && isRecording) stopRecording(); }, 10000);
    } catch {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri && socketRef.current) {
        socketRef.current.emit('voiceMessage', {
          gameId: gameState?.gameId,
          senderId: uid,
          audioUri: uri,
          timestamp: Date.now(),
        });
      }
      setRecording(null);
      setIsRecording(false);
    } catch {}
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted && isRecording) stopRecording();
  };

  // socket init
  const initializeSocket = async (token) =>
    new Promise((resolve, reject) => {
      socketRef.current = io(API_URL, {
        auth: { token },
        query: { gameId: gameState?.gameId || gameId },
      });

      socketRef.current.on('connect', () => {
        setConnectionStatus('connected');
        playSound(gameStartSound);
        if (isSpectator) {
          // NEW: ack to detect failures
          socketRef.current.emit('joinAsSpectator', { gameId, friendId }, (res) => {
            if (!res?.ok) {
              showErrorMessage(res?.error || 'Failed to join as spectator');
              setConnectionStatus('error');
            }
          });
        } else {
          socketRef.current.emit('joinGame', { gameId: gameState?.gameId || gameId, userId: uid });
          if (mode !== 'unlimited' && userColor === 'white') startTimer('white');
        }
        resolve();
      });

      // voice rx
      socketRef.current.on('voiceMessage', async (data) => {
        if (data.senderId !== uid && !isSpectator) {
          setFriendIsTalking(true);
          try {
            const sound = new Audio.Sound();
            await sound.loadAsync({ uri: data.audioUri });
            await sound.playAsync();
            setTimeout(() => setFriendIsTalking(false), 2000);
          } catch {}
        }
      });

      // spectator initial sync
      socketRef.current.on('spectatorGameState', (data) => {
        setWhitePlayerId(data.whitePlayerId);
        setBlackPlayerId(data.blackPlayerId);
        setGameState({ board: data.board, gameId: data.gameId, turn: data.turn, status: data.status });
        setCurrentTurn(data.turn);
        setIsBoardFlipped(false);
        if (data.capturedPieces) setCapturedPieces(data.capturedPieces);
        loadPlayersById(data.whitePlayerId, data.blackPlayerId).catch(() => {});
      });

      socketRef.current.on('gameStarted', (data) => {
        setWhitePlayerId(data.whitePlayerId);
        setBlackPlayerId(data.blackPlayerId);
        setGameState((prev) => ({ ...prev, board: data.board, turn: data.turn, status: 'ongoing' }));
        setCurrentTurn(data.turn);
        playSound(gameStartSound);
        if (isSpectator) {
          loadPlayersById(data.whitePlayerId, data.blackPlayerId).catch(() => {});
        } else if (mode !== 'unlimited') {
          startTimer(data.turn);
        }
      });

      socketRef.current.on('gameState', (data) => {
        setGameState((p) => ({ ...p, board: data.board, turn: data.turn, status: data.status }));
        setCurrentTurn(data.turn);
        if (data.moveHistory) setMoves(data.moveHistory.map((m) => m.san));
        if (data.capturedPieces) setCapturedPieces(data.capturedPieces);
      });

      socketRef.current.on('gameUpdate', (data) => {
        setGameState((p) => ({ ...p, board: data.board, turn: data.turn, status: data.status }));
        setCurrentTurn(data.turn);
        if (data.lastMove?.san) setMoves((prev) => [...prev, data.lastMove.san]);
        if (data.lastMove) {
          if (data.lastMove.captured) {
            playSound(captureSound);
            if (data.capturedPieces) setCapturedPieces(data.capturedPieces);
          } else if (data.lastMove.castle) {
            playSound(castleSound);
          } else if (data.lastMove.check) {
            playSound(checkSound);
          } else {
            playSound(moveSound);
          }
        }
        if (!isSpectator && mode !== 'unlimited') startTimer(data.turn);
        if (['checkmate', 'stalemate', 'draw'].includes(data.status)) {
          handleGameEnd(data.status, data.winnerId);
        }
      });

      socketRef.current.on('gameEnded', (data) => {
        playSound(gameEndSound);
        handleGameEnd(data.reason, data.winnerId);
      });

      socketRef.current.on('connect_error', (err) => {
        setConnectionStatus('error');
        showErrorMessage('Failed to connect to game server. Please try again.');
        reject(err);
      });

      socketRef.current.on('error', (data) => {
        showErrorMessage(data.message || 'Game error occurred');
        shakeAnimation();
      });

      setTimeout(() => {
        if (socketRef.current && !socketRef.current.connected) {
          setConnectionStatus('timeout');
          showErrorMessage('Connection timeout. Please check your internet connection.');
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      // chat live listener (NEW)
      socketRef.current.on('chatMessage', (m) => {
        if (!friendId || !uid) return;
        if (m.senderId === uid || m.senderId === friendId) {
          setChatMessages((prev) => [...prev, m]);
        }
      });
    });

  const startTimer = (turn) => {
    if (mode === 'unlimited') return;
    clearInterval(userTimerRef.current);
    clearInterval(friendTimerRef.current);
    const myTurn = (turn === 'white' && userColor === 'white') || (turn === 'black' && userColor === 'black');
    if (myTurn) {
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

  const handleForfeit = useCallback(() => {
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
              gameId: gameState?.gameId,
              userId: uid,
              winnerId: friendId,
            });
          },
        },
      ],
    );
  }, [gameState?.gameId, uid, friendId]);

  useEffect(() => {
    const onBackPress = () => {
      if (showMoves) { setShowMoves(false); return true; }
      if (chatVisible) { setChatVisible(false); return true; }
      if (gameOverModal) { setGameOverModal(false); return true; }
      if (isSpectator) {
        if (socketRef.current && gameId) socketRef.current.emit('leaveSpectator', { gameId });
        navigation.goBack();
        return true;
      }
      handleForfeit();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [showMoves, chatVisible, gameOverModal, isSpectator, gameId, navigation, handleForfeit]);

  const handleGameEnd = (reason, winnerId) => {
    clearInterval(userTimerRef.current);
    clearInterval(friendTimerRef.current);
    let winnerName = '';
    if (reason === 'draw' || reason === 'stalemate') {
      winnerName = 'No winner (draw)';
    } else if (winnerId) {
      if (winnerId === uid) winnerName = user?.username || 'You';
      else if (winnerId === friendId) winnerName = friend?.username || 'Opponent';
      else if (winnerId === whitePlayerId) winnerName = whitePlayer?.username || 'White';
      else if (winnerId === blackPlayerId) winnerName = blackPlayer?.username || 'Black';
      else winnerName = 'Unknown';
    } else {
      winnerName = 'Unknown';
    }
    setGameOverMessage(`${reason}. Winner: ${winnerName}`);
    setGameOverModal(true);
  };

  const cleanup = () => {
    if (socketRef.current) socketRef.current.disconnect();
    clearInterval(userTimerRef.current);
    clearInterval(friendTimerRef.current);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (recording) {
      recording.stopAndUnloadAsync().catch(() => {});
    }
  };

  const formatTime = (seconds) => {
    if (mode === 'unlimited') return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleBoardFlip = () => setIsBoardFlipped(!isBoardFlipped);

  const isUserPiece = (row, col) => {
    const piece = gameState?.board?.[row]?.[col];
    if (!piece) return false;
    const isWhite = piece.toUpperCase() === piece;
    return (userColor === 'white' && isWhite) || (userColor === 'black' && !isWhite);
  };

  const handleSquarePress = (row, col) => {
    if (!gameState || loading || gameState.status !== 'ongoing') return;
    if (isSpectator) return;
    const isUserTurn = currentTurn === userColor;
    if (!isUserTurn) { shakeAnimation(); return; }
    if (!selectedSquare) {
      if (gameState.board[row][col] && isUserPiece(row, col)) {
        setSelectedSquare({ row, col });
      }
    } else {
      if (selectedSquare.row === row && selectedSquare.col === col) {
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
      } catch {
        showErrorMessage('Failed to send move. Please try again.');
        shakeAnimation();
      }
    }
  };

  const renderSquare = (row, col) => {
    const isDark = (row + col) % 2 === 1;
    const piece = gameState?.board?.[row]?.[col] || '';
    const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
    const isUserPieceHighlight = piece && isUserPiece(row, col);
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        onPress={() => handleSquarePress(row, col)}
        disabled={loading || gameState?.status !== 'ongoing' || isSpectator}
        activeOpacity={0.7}
        style={[
          styles.square,
          {
            backgroundColor: isDark ? '#8B4513' : '#F5DEB3',
            borderWidth: isSelected ? 3 : isUserPieceHighlight ? 2 : 0,
            borderColor: isSelected ? '#FFD700' : isUserPieceHighlight ? '#32CD32' : 'transparent',
          },
        ]}
      >
        {piece ? <Image source={pieceImages[piece]} style={styles.piece} resizeMode="contain" /> : null}
      </TouchableOpacity>
    );
  };

  const renderBoard = () => {
    const board = [];
    const boardToRender = isBoardFlipped
      ? gameState?.board?.slice().reverse().map((r) => r.slice().reverse())
      : gameState?.board;
    if (!boardToRender) return null;
    for (let row = 0; row < 8; row++) {
      const rowSquares = [];
      for (let col = 0; col < 8; col++) {
        const actualRow = isBoardFlipped ? 7 - row : row;
        const actualCol = isBoardFlipped ? 7 - col : col;
        rowSquares.push(renderSquare(actualRow, actualCol));
      }
      board.push(
        <View key={`row-${row}`} style={styles.boardRow}>
          {rowSquares}
        </View>
      );
    }
    return board;
  };

  const renderCapturedPieces = (pieces, label) => {
    if (!pieces || pieces.length === 0) return null;
    return (
      <View style={styles.capturedSection}>
        <Text style={styles.capturedLabel}>{label}</Text>
        <FlatList
          horizontal
          data={pieces}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => <Image source={pieceImages[item]} style={styles.capturedPiece} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.capturedList}
        />
      </View>
    );
  };

  const renderPlayerInfo = (playerLike, colorLabel, timeLeft) => {
    const validColorLabel = colorLabel === 'white' || colorLabel === 'black' ? colorLabel : 'unknown';
    const isPlayerTurn = currentTurn === validColorLabel;
    const displayName = playerLike?.username || spectatorFriendName || (validColorLabel === 'white' ? 'White' : validColorLabel === 'black' ? 'Black' : 'Unknown');
    const initial = displayName?.toUpperCase() || validColorLabel?.toUpperCase() || 'U';
    const isCurrentPlayer = (validColorLabel === userColor);
    const isFriendTalking = friendIsTalking && !isCurrentPlayer;
    return (
      <View style={[styles.playerCard, { backgroundColor: '#141414' }]}>
        <View style={styles.playerInfo}>
          {playerLike?.profile_picture ? (
            <Image source={{ uri: playerLike.profile_picture }} style={[styles.playerAvatar]} />
          ) : (
            <View style={styles.playerAvatarPlaceholder}>
              <Text style={styles.playerAvatarText}>{initial}</Text>
            </View>
          )}
          {!isSpectator && (
            <View style={styles.voiceIndicator}>
              <Feather name={isFriendTalking ? 'mic' : 'mic-off'} size={12} color={isFriendTalking ? '#4ECDC4' : '#555'} />
            </View>
          )}
          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>{displayName} ({validColorLabel})</Text>
            <Text style={styles.playerStatus}>{isPlayerTurn ? 'Your turn' : 'Waiting...'}</Text>
          </View>
        </View>
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, timeLeft <= 10 && styles.urgentTimer]}>{formatTime(timeLeft)}</Text>
        </View>
      </View>
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
      <View style={styles.connectionStatus}>
        <Feather name={config.icon} size={14} color={config.color} />
        <Text style={[styles.connectionText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  // chat handlers (NEW)
  const openInGameChat = async () => {
    try {
      setChatVisible(true);
      const t = authTokenRef.current;
      const res = await axios.get(`${API_URL}/api/chat/history/${friendId}`, { headers: { Authorization: `Bearer ${t}` } });
      setChatMessages(res.data.messages || []);
      socketRef.current?.emit('joinChat', { friendId });
    } catch {
      showErrorMessage('Failed to load chat history');
    }
  };

  const sendInGameChat = () => {
    if (!chatInput.trim()) return;
    const tempId = Date.now();
    const optimistic = {
      id: tempId,
      senderId: uid,
      receiverId: friendId,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
      senderUsername: user?.username,
    };
    setChatMessages((prev) => [...prev, optimistic]);
    socketRef.current?.emit('sendChat', { toUserId: friendId, message: chatInput.trim(), tempId }, (ack) => {
      if (!ack?.ok) showErrorMessage(ack?.error || 'Send failed');
    });
    setChatInput('');
  };

  const closeInGameChat = () => {
    socketRef.current?.emit('leaveChat', { friendId });
    setChatVisible(false);
  };

  if (loading || !userColor) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Setting up your game...</Text>
        <Text style={styles.loadingSubtext}>Connecting…</Text>
      </View>
    );
  }

  const topCard = isSpectator ? (blackPlayer ?? {}) : (friend ?? {});
  const bottomCard = isSpectator ? (whitePlayer ?? {}) : (user ?? {});

  const topCaptured = isSpectator ? capturedPieces.white : (userColor === 'white' ? capturedPieces.black : capturedPieces.white);
  const bottomCaptured = isSpectator ? capturedPieces.black : capturedPieces[userColor];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        {isSpectator ? (
          <TouchableOpacity onPress={() => { socketRef.current?.emit('leaveSpectator', { gameId }); navigation.goBack(); }} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color="#EDEDED" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton}>
            <Feather name="chess" size={18} color="#EDEDED" />
          </View>
        )}

        <View style={styles.headerCenter}>
          <Text style={styles.gameMode}>{String(mode ?? 'game').toUpperCase()}</Text>
          {renderConnectionStatus()}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!isSpectator && audioPermission && (
            <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={[styles.voiceChatButton, isRecording && styles.recording]}>
              <Feather name={isRecording ? 'mic-off' : 'mic'} size={18} color="#EDEDED" />
            </TouchableOpacity>
          )}
          {/* Moves modal toggle */}
          <TouchableOpacity onPress={() => setShowMoves(!showMoves)} style={styles.movesButton}>
            <Feather name="list" size={18} color="#EDEDED" />
          </TouchableOpacity>
          {/* Chat button (NEW) */}
          {!isSpectator && (
            <TouchableOpacity onPress={openInGameChat} style={styles.movesButton}>
              <Feather name="message-circle" size={18} color="#EDEDED" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Top player */}
      {renderPlayerInfo(topCard, isSpectator ? 'black' : (userColor === 'white' ? 'black' : 'white'), friendTime)}

      {/* Top captured */}
      {renderCapturedPieces(topCaptured, `Captured by ${isSpectator ? 'White' : (userColor === 'white' ? 'You' : 'Opponent')}`)}

      {/* Board */}
      <View style={styles.boardContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          {renderBoard()}
        </Animated.View>
      </View>

      {/* Bottom captured */}
      {renderCapturedPieces(bottomCaptured, `Captured by ${isSpectator ? 'Black' : (userColor === 'white' ? 'Opponent' : 'You')}`)}

      {/* Bottom player */}
      {renderPlayerInfo(bottomCard, isSpectator ? 'white' : userColor, userTime)}

      {/* Voice push-to-talk */}
      {!isSpectator && audioPermission && (
        <View style={styles.voiceControls}>
          <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={[styles.pushToTalkButton, isRecording && styles.recording]}>
            <Text style={styles.pushToTalkText}>{isRecording ? 'Stop Talk' : 'Push to Talk'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Game controls */}
      {!isSpectator && (
        <View style={styles.gameControls}>
          <TouchableOpacity onPress={handleForfeit} style={styles.forfeitButton}>
            <Text style={styles.forfeitText}>Forfeit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {error ? (
        <View style={styles.errorMessage}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Moves modal */}
      <Modal visible={showMoves} transparent animationType="fade" onRequestClose={() => setShowMoves(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.movesModal}>
            <View style={styles.movesHeader}>
              <Text style={styles.movesTitle}>Move History</Text>
              <TouchableOpacity onPress={() => setShowMoves(false)}><Feather name="x" size={18} color="#EDEDED" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.movesList}>
              {moves.length === 0 ? (
                <Text style={styles.noMovesText}>No moves yet</Text>
              ) : (
                moves.map((move, index) => (
                  <Text key={index} style={styles.moveText}>{`${Math.floor(index / 2) + 1}. ${move}`}</Text>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Chat modal (NEW) */}
      <Modal visible={chatVisible} transparent animationType="fade" onRequestClose={closeInGameChat}>
        <View style={styles.modalOverlay}>
          <View style={styles.movesModal}>
            <View style={styles.movesHeader}>
              <Text style={styles.movesTitle}>Chat</Text>
              <TouchableOpacity onPress={closeInGameChat}><Feather name="x" size={18} color="#EDEDED" /></TouchableOpacity>
            </View>
            <View style={{ padding: 16, maxHeight: '60%' }}>
              <FlatList
                data={chatMessages}
                keyExtractor={(m) => String(m.id)}
                renderItem={({ item }) => (
                  <View style={{ alignSelf: item.senderId === uid ? 'flex-end' : 'flex-start', backgroundColor: '#1C1C1C', padding: 8, borderRadius: 8, marginVertical: 4, maxWidth: '80%' }}>
                    <Text style={{ color: '#EDEDED' }}>{item.message}</Text>
                    <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                  </View>
                )}
              />
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type a message"
                  placeholderTextColor="#777"
                  style={{ flex: 1, color: '#EDEDED', backgroundColor: '#1C1C1C', borderRadius: 10, paddingHorizontal: 12, height: 44 }}
                />
                <TouchableOpacity onPress={sendInGameChat} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333', borderRadius: 10 }}>
                  <Feather name="send" size={18} color="#4ECDC4" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Game Over */}
      <Modal visible={gameOverModal} transparent animationType="fade" onRequestClose={() => setGameOverModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverModal}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverMessage}>{gameOverMessage}</Text>
            <TouchableOpacity onPress={() => { setGameOverModal(false); navigation.goBack(); }} style={styles.gameOverButton}>
              <Text style={styles.gameOverButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F', paddingTop: 35 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F0F' },
  loadingText: { color: '#FFFFFF', fontSize: 18, marginTop: 20, fontWeight: '600' },
  loadingSubtext: { color: '#AAAAAA', fontSize: 14, marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333333' },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  headerCenter: { alignItems: 'center' },
  gameMode: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  connectionText: { fontSize: 12, marginLeft: 4, fontWeight: '500' },
  voiceChatButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  movesButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  playerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 15, marginVertical: 8, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#333333' },
  playerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  playerAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#555555' },
  playerAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#555555' },
  playerAvatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  voiceIndicator: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4ECDC4' },
  playerDetails: { marginLeft: 15, flex: 1 },
  playerName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  playerStatus: { color: '#AAAAAA', fontSize: 12, marginTop: 2 },
  timerContainer: { backgroundColor: '#333333', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#555555' },
  timerText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', minWidth: 50, textAlign: 'center' },
  urgentTimer: { color: '#FF6B6B' },
  capturedSection: { marginHorizontal: 15, marginVertical: 5, padding: 10, backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: '#333333' },
  capturedLabel: { color: '#AAAAAA', fontSize: 12, marginBottom: 8, textAlign: 'center' },
  capturedList: { paddingHorizontal: 5 },
  capturedPiece: { width: 24, height: 24, marginHorizontal: 2 },
  boardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  boardRow: { flexDirection: 'row' },
  square: { width: SQUARE_SIZE, height: SQUARE_SIZE, justifyContent: 'center', alignItems: 'center' },
  piece: { width: SQUARE_SIZE * 0.8, height: SQUARE_SIZE * 0.8 },
  voiceControls: { alignItems: 'center', paddingVertical: 10 },
  pushToTalkButton: { backgroundColor: '#333333', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#555555' },
  recording: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  pushToTalkText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  gameControls: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 },
  forfeitButton: { backgroundColor: '#AA0000', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#333333' },
  forfeitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  errorMessage: { backgroundColor: '#AA0000', marginHorizontal: 15, marginVertical: 5, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333333' },
  errorText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', fontWeight: '500' },
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
  gameOverButton: { backgroundColor: '#333333', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#555555' },
  gameOverButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
