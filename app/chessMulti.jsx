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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';

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

  // when spectating, load actual players
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

  // colors and ids
  const [userColor, setUserColor] = useState(null);
  const [whitePlayerId, setWhitePlayerId] = useState(null);
  const [blackPlayerId, setBlackPlayerId] = useState(null);

  const [isBoardFlipped, setIsBoardFlipped] = useState(false);

  // anim
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const route = useRoute();
  const navigation = useNavigation();

  // read params defensively
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
        axios.get(`${API_URL}/api/users/${wId}`, { headers: { Authorization: `Bearer ${t}` } }),
        axios.get(`${API_URL}/api/users/${bId}`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      setWhitePlayer(w.data);
      setBlackPlayer(b.data);
    } catch (_) {
      // ignore fetch issues for spectators
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const token = await AsyncStorage.getItem('token');
        authTokenRef.current = token;
        if (!token) throw new Error('No authentication token found');

        // preload basic user/opponent for non-spectators
        if (!isSpectator) {
          const [userResponse, friendResponse] = await Promise.all([
            axios.get(`${API_URL}/api/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API_URL}/api/users/${friendId}`, { headers: { Authorization: `Bearer ${token}` } }),
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
          if (isSpectator) {
            // show actual players
            await loadPlayersById(routeWhitePlayerId, routeBlackPlayerId);
          }
        } else {
          // default assignment when initiating
          setWhitePlayerId(uid);
          setBlackPlayerId(friendId);
          setUserColor('white');
        }

        setGameState({
          board: initialBoard,
          gameId: gameId || `game_${Date.now()}`,
          turn: 'white',
          status: 'ongoing',
        });
        setUserTime(initialTime);
        setFriendTime(initialTime);

        // connect socket
        await initializeSocket(token);
      } catch (err) {
        showErrorMessage(err?.response?.data?.message || 'Failed to start game. Please try again.');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [isSpectator, loadPlayersById]);

  const initializeSocket = async (token) =>
    new Promise((resolve, reject) => {
      socketRef.current = io(API_URL, {
        auth: { token },
        query: { gameId: gameState?.gameId || gameId },
      });

      socketRef.current.on('connect', () => {
        setConnectionStatus('connected');
        if (isSpectator) {
          socketRef.current.emit('joinAsSpectator', { gameId, friendId });
        } else {
          socketRef.current.emit('joinGame', { gameId: gameState?.gameId || gameId, userId: uid });
          if (mode !== 'unlimited' && userColor === 'white') startTimer('white');
        }
        resolve();
      });

      // spectators receive both player ids
      socketRef.current.on('spectatorGameState', (data) => {
        setWhitePlayerId(data.whitePlayerId);
        setBlackPlayerId(data.blackPlayerId);
        setGameState({ board: data.board, gameId: data.gameId, turn: data.turn, status: data.status });
        setCurrentTurn(data.turn);
        setIsBoardFlipped(false);
        loadPlayersById(data.whitePlayerId, data.blackPlayerId).catch(() => {});
      });

      socketRef.current.on('gameStarted', (data) => {
        setWhitePlayerId(data.whitePlayerId);
        setBlackPlayerId(data.blackPlayerId);
        setGameState((prev) => ({ ...prev, board: data.board, turn: data.turn, status: 'ongoing' }));
        setCurrentTurn(data.turn);
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
      });

      socketRef.current.on('gameUpdate', (data) => {
        setGameState((p) => ({ ...p, board: data.board, turn: data.turn, status: data.status }));
        setCurrentTurn(data.turn);
        if (data.lastMove?.san) setMoves((prev) => [...prev, data.lastMove.san]);
        if (!isSpectator && mode !== 'unlimited') startTimer(data.turn);
        if (['checkmate', 'stalemate', 'draw'].includes(data.status)) {
          handleGameEnd(data.status, data.winnerId ?? data.winner);
        }
      });

      socketRef.current.on('gameEnded', (data) => {
        handleGameEnd(data.reason, data.winnerId ?? data.winner);
      });

      socketRef.current.on('forfeit', (data) => {
        handleGameEnd('Forfeit', data.winnerId);
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
    });

  const startTimer = (turn) => {
    if (mode === 'unlimited') return;
    clearInterval(userTimerRef.current);
    clearInterval(friendTimerRef.current);

    if ((turn === 'white' && userColor === 'white') || (turn === 'black' && userColor === 'black')) {
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
  }, [showMoves, gameOverModal, isSpectator, gameId, navigation, handleForfeit]);

  const handleGameEnd = (reason, winnerId) => {
    clearInterval(userTimerRef.current);
    clearInterval(friendTimerRef.current);

    let winnerName = '';
    if (reason === 'draw' || reason === 'stalemate') {
      winnerName = 'No winner (draw)';
    } else if (winnerId) {
      if (winnerId === uid) winnerName = user?.username || 'You';
      else if (winnerId === friendId) winnerName = friend?.username || 'Opponent';
      else if (winnerId === whitePlayerId) winnerName = 'White';
      else if (winnerId === blackPlayerId) winnerName = 'Black';
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
      } catch (err) {
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
        style={[
          styles.square,
          { width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: isDark ? '#B58863' : '#F0D9B5' },
          isSelected && styles.selectedSquare,
          isUserPieceHighlight && styles.userPiece,
        ]}
        onPress={() => handleSquarePress(row, col)}
        disabled={loading || gameState?.status !== 'ongoing' || isSpectator}
        activeOpacity={0.7}
      >
        {piece ? <Image source={pieceImages[piece]} style={styles.pieceImage} /> : null}
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

  const renderPlayerInfo = (playerLike, colorLabel, timeLeft) => {
    const isPlayerTurn = currentTurn === colorLabel;
    const fallbackName = colorLabel === 'white' ? 'White' : 'Black';
    return (
      <View style={[styles.playerContainer, isPlayerTurn && styles.activePlayerCard]}>
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.playerGradient}>
          {playerLike?.profile_picture ? (
            <Image source={{ uri: playerLike.profile_picture }} style={styles.profilePic} />
          ) : (
            <View style={styles.placeholderPic}>
              <Text style={styles.placeholderText}>
                {(playerLike?.username?.fallbackName).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>
              {(playerLike?.username ?? fallbackName)} ({colorLabel})
            </Text>
            <Text style={styles.playerStatus}>{isPlayerTurn ? 'Your turn' : 'Waiting...'}</Text>
          </View>
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, timeLeft <= 10 && styles.urgentTimer]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
        </LinearGradient>
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
      <View style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: config.color, fontSize: 12, fontWeight: '600' }}>{config.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Setting up your game...</Text>
        <Text style={styles.loadingSubtext}>Connecting…</Text>
      </SafeAreaView>
    );
  }

  // decide which names to show
  const topCard = isSpectator ? (blackPlayer ?? { username: 'Black' }) : friend;
  const bottomCard = isSpectator ? (whitePlayer ?? { username: 'White' }) : user;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        {!isSpectator ? (
          <TouchableOpacity onPress={handleForfeit} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#EDEDED" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => { socketRef.current?.emit('leaveSpectator', { gameId }); navigation.goBack(); }} style={styles.backButton}>
            <Ionicons name="exit-outline" size={20} color="#EDEDED" />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.gameMode}>{(mode ?? 'game')?.toUpperCase()}</Text>
          {renderConnectionStatus()}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowMoves(!showMoves)} style={styles.movesButton}>
            <Ionicons name="list" size={20} color="#EDEDED" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleBoardFlip} style={[styles.movesButton, { marginLeft: 10 }]}>
            <MaterialIcons name="flip" size={20} color="#EDEDED" />
          </TouchableOpacity>
        </View>
      </View>

      {renderPlayerInfo(topCard, isSpectator ? 'black' : (userColor === 'white' ? 'black' : 'white'), friendTime)}

      <View style={styles.boardContainer}>
        <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {renderBoard()}
        </View>
      </View>

      {renderPlayerInfo(bottomCard, isSpectator ? 'white' : userColor, userTime)}

      <View style={styles.bottomActions}>
        {!isSpectator && (
          <TouchableOpacity onPress={handleForfeit} style={styles.actionButton}>
            <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.actionButtonGradient}>
              <Feather name="flag" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Forfeit</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Modal visible={showMoves} transparent animationType="fade" onRequestClose={() => setShowMoves(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.movesModal}>
            <View style={styles.movesHeader}>
              <Text style={styles.movesTitle}>Move History</Text>
              <TouchableOpacity onPress={() => setShowMoves(false)}>
                <Ionicons name="close" size={20} color="#EDEDED" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.movesList} showsVerticalScrollIndicator={false}>
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

      <Modal visible={gameOverModal} transparent animationType="fade" onRequestClose={() => setGameOverModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.gameOverModal}>
            <Ionicons name="trophy" size={32} color="#4ECDC4" />
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverMessage}>{gameOverMessage}</Text>
            <View style={styles.gameOverActions}>
              <TouchableOpacity
                onPress={() => {
                  setGameOverModal(false);
                  navigation.goBack();
                }}
                style={styles.gameOverButton}
              >
                <View style={styles.exitButtonGradient}>
                  <Text style={[styles.gameOverButtonText, { color: '#FF6B6B' }]}>Exit</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 35, backgroundColor: '#0F0F0F' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { color: '#EDEDED', fontSize: 20, fontWeight: '600', marginTop: 20 },
  loadingSubtext: { color: '#888', fontSize: 16, marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  gameMode: { color: '#EDEDED', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  movesButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  playerContainer: { marginHorizontal: '5%', marginVertical: 10, borderRadius: 15, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  playerGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  profilePic: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#333', marginRight: 15 },
  placeholderPic: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#444', marginRight: 15 },
  placeholderText: { color: '#EDEDED', fontSize: 20, fontWeight: 'bold' },
  playerDetails: { flex: 1 },
  playerName: { color: '#EDEDED', fontSize: 18, fontWeight: '600', marginBottom: 2 },
  playerStatus: { color: 'rgba(237,237,237,0.7)', fontSize: 14 },
  timerContainer: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  timerText: { color: '#EDEDED', fontSize: 18, fontWeight: 'bold', minWidth: 60, textAlign: 'center' },
  urgentTimer: { color: '#FF6B6B' },
  boardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, minHeight: BOARD_SIZE + 20 },
  board: { backgroundColor: '#8B4513', borderRadius: 10, padding: 5, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
  boardRow: { flexDirection: 'row' },
  square: { justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(0, 0, 0, 0.1)' },
  selectedSquare: { backgroundColor: '#4ECDC4', borderWidth: 2, borderColor: '#44A08D' },
  userPiece: { backgroundColor: 'rgba(78, 205, 196, 0.3)' },
  pieceImage: { width: SQUARE_SIZE * 0.8, height: SQUARE_SIZE * 0.8, resizeMode: 'contain' },
  bottomActions: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  actionButton: { marginHorizontal: 10 },
  actionButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  errorContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#FF6B6B', padding: 15, borderRadius: 10, elevation: 5 },
  errorText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  movesModal: { width: '100%', maxWidth: 300, backgroundColor: '#1C1C1C', borderRadius: 20, padding: 20 },
  movesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  movesTitle: { color: '#EDEDED', fontSize: 20, fontWeight: 'bold' },
  movesList: { maxHeight: 300 },
  noMovesText: { color: '#888', fontSize: 16, textAlign: 'center', fontStyle: 'italic' },
  moveText: { color: '#EDEDED', fontSize: 14, paddingVertical: 4 },
  gameOverModal: { width: '100%', maxWidth: 320, backgroundColor: '#1C1C1C', borderRadius: 20, padding: 30, alignItems: 'center' },
  gameOverTitle: { color: '#EDEDED', fontSize: 24, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  gameOverMessage: { color: '#888', fontSize: 16, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  gameOverActions: { flexDirection: 'row', width: '100%' },
  gameOverButton: { flex: 1, marginHorizontal: 5 },
  gameOverButtonGradient: { paddingVertical: 12, borderRadius: 15, alignItems: 'center' },
  gameOverButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  exitButtonGradient: { paddingVertical: 12, borderRadius: 15, alignItems: 'center', backgroundColor: '#333' },
  exitButtonText: { color: '#FF6B6B', fontSize: 16, fontWeight: '600' },
  activePlayerCard: { borderWidth: 2, borderColor: '#4ECDC4' },
});
