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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';

const { width } = Dimensions.get('window');
const SQUARE_SIZE = Math.min(width / 8, 45); // Chessboard square size

export default function MultiplayerPage() {
  const [user, setUser] = useState(null);
  const [friend, setFriend] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [userTime, setUserTime] = useState(0);
  const [friendTime, setFriendTime] = useState(0);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const route = useRoute();
  const navigation = useNavigation();
  const { mode, initialTime, uid, friendId } = route.params;
  const API_URL = 'http://192.168.243.45:3000';
  const socketRef = useRef(null);
  const userTimerRef = useRef(null);
  const friendTimerRef = useRef(null);

  // Initial chessboard setup (FEN-like representation)
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

  useEffect(() => {
    initialize();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(userTimerRef.current);
      clearInterval(friendTimerRef.current);
    };
  }, []);

  const initialize = async () => {
    try {
      setLoading(true);
      setError('');
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch user data
      const userResponse = await axios.get(`${API_URL}/api/users/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(userResponse.data); // Expect { id, username, email, profile_picture, matchesPlayed, matchesWon }

      // Fetch friend data
      const friendResponse = await axios.get(`${API_URL}/api/users/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriend(friendResponse.data);

      // Start game
      const gameResponse = await axios.post(
        `${API_URL}/api/game/start`,
        { userId: uid, friendId, mode, initialTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGameState({
        board: initialBoard,
        gameId: gameResponse.data.gameId,
        turn: 'white', // Assume user is white
      });
      setUserTime(initialTime);
      setFriendTime(initialTime);

      // Initialize Socket.IO
      socketRef.current = io(API_URL, {
        auth: { token },
        query: { gameId: gameResponse.data.gameId },
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to Socket.IO server');
        socketRef.current.emit('joinGame', { gameId: gameResponse.data.gameId, userId: uid });
      });

      socketRef.current.on('gameUpdate', (data) => {
        setGameState({ ...gameState, board: data.board, turn: data.turn });
        setCurrentTurn(data.turn);
        if (mode !== 'unlimited') {
          startTimer(data.turn);
        }
        if (data.status === 'checkmate' || data.status === 'stalemate') {
          handleGameEnd(data.status, data.winner);
        }
      });

      socketRef.current.on('forfeit', (data) => {
        handleGameEnd('Forfeit', data.winnerId);
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err.message);
        setError('Failed to connect to game server. Please try again.');
      });

      socketRef.current.on('error', (data) => {
        console.error('Socket.IO error:', data.message);
        setError(data.message || 'Game error occurred');
      });

      // Start timer for white (user) if mode isn't unlimited
      if (mode !== 'unlimited') {
        startTimer('white');
      }
    } catch (err) {
      console.error('Initialization error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to start game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (turn) => {
    if (mode === 'unlimited') return;

    if (turn === 'white') {
      clearInterval(friendTimerRef.current);
      userTimerRef.current = setInterval(() => {
        setUserTime((prev) => {
          if (prev <= 0) {
            clearInterval(userTimerRef.current);
            socketRef.current.emit('gameEnd', {
              gameId: gameState.gameId,
              reason: 'Time out',
              winnerId: friendId,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(userTimerRef.current);
      friendTimerRef.current = setInterval(() => {
        setFriendTime((prev) => {
          if (prev <= 0) {
            clearInterval(friendTimerRef.current);
            socketRef.current.emit('gameEnd', {
              gameId: gameState.gameId,
              reason: 'Time out',
              winnerId: uid,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSquarePress = async (row, col) => {
    if (!gameState || loading || gameState.turn !== (user?.id === uid ? 'white' : 'black')) {
      return;
    }

    if (!selectedSquare) {
      // Select a piece
      if (gameState.board[row][col] && isUserPiece(row, col)) {
        setSelectedSquare({ row, col });
      }
    } else {
      // Attempt to move
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    }
  };

  const isUserPiece = (row, col) => {
    const piece = gameState.board[row][col];
    const isWhite = piece.toUpperCase() === piece;
    return (user?.id === uid && isWhite) || (user?.id !== uid && !isWhite);
  };

  const handleForfeit = () => {
    Alert.alert(
      'Forfeit Game',
      'Are you sure you want to forfeit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forfeit',
          style: 'destructive',
          onPress: () => {
            socketRef.current.emit('forfeit', {
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
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    const winner = winnerId === uid ? user : friend;
    Alert.alert(
      'Game Over',
      `${reason}. Winner: ${winner?.username || 'Unknown'}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const renderSquare = (row, col) => {
    const isDark = (row + col) % 2 === 1;
    const piece = gameState?.board[row][col] || '';
    const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.square,
          {
            backgroundColor: isDark ? '#769656' : '#EEEED2',
            borderWidth: isSelected ? 2 : 0,
            borderColor: '#B76E79',
          },
        ]}
        onPress={() => handleSquarePress(row, col)}
        disabled={loading}
      >
        {piece ? (
          <Text style={styles.piece}>{pieceToUnicode(piece)}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const pieceToUnicode = (piece) => {
    const pieces = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
    };
    return pieces[piece] || '';
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#B76E79" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F0F0F', '#000000']} style={styles.background}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={30} color="#EDEDED" />
          </TouchableOpacity>
          <Text style={styles.title}>{mode.charAt(0).toUpperCase() + mode.slice(1)} Mode</Text>
        </View>

        <View style={styles.playerInfo}>
          <View style={styles.player}>
            {friend?.profile_picture ? (
              <Image
                source={{ uri: `${API_URL}${friend.profile_picture}` }} // Removed /api from URI
                style={styles.profilePic}
              />
            ) : (
              <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.placeholderPic}>
                <Text style={styles.placeholderText}>{friend?.username?.[0]?.toUpperCase() || 'U'}</Text>
              </LinearGradient>
            )}
            <Text style={styles.playerName}>{friend?.username || 'Friend'}</Text>
            <Text style={styles.timer}>
              {mode !== 'unlimited' ? `${Math.floor(friendTime / 60)}:${(friendTime % 60).toString().padStart(2, '0')}` : '∞'}
            </Text>
          </View>
        </View>

        <View style={styles.boardContainer}>
          {gameState ? renderBoard() : <Text style={styles.errorText}>Loading board...</Text>}
        </View>

        <View style={styles.playerInfo}>
          <View style={styles.player}>
            {user?.profile_picture ? (
              <Image
                source={{ uri: `${API_URL}${user.profile_picture}` }} // Removed /api from URI
                style={styles.profilePic}
              />
            ) : (
              <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.placeholderPic}>
                <Text style={styles.placeholderText}>{user?.username?.[0]?.toUpperCase() || 'U'}</Text>
              </LinearGradient>
            )}
            <Text style={styles.playerName}>{user?.username || 'You'}</Text>
            <Text style={styles.timer}>
              {mode !== 'unlimited' ? `${Math.floor(userTime / 60)}:${(userTime % 60).toString().padStart(2, '0')}` : '∞'}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.forfeitButton}
          onPress={handleForfeit}
          disabled={loading}
        >
          <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.forfeitButtonGradient}>
            <Text style={styles.forfeitButtonText}>Forfeit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 15,
    paddingTop: 30,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginRight: 10,
  },
  title: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.08, 30),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 10,
    width: '90%',
    justifyContent: 'space-between',
  },
  profilePic: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    borderWidth: 2,
    borderColor: '#444444',
  },
  placeholderPic: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444444',
  },
  placeholderText: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.06, 24),
    fontWeight: 'bold',
  },
  playerName: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.045, 16),
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  timer: {
    color: '#B76E79',
    fontSize: Math.min(width * 0.045, 16),
    fontWeight: '600',
  },
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    fontSize: Math.min(SQUARE_SIZE * 0.8, 30),
    color: '#000000',
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  errorText: {
    color: '#DC143C',
    fontSize: Math.min(width * 0.04, 14),
    marginVertical: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  forfeitButton: {
    marginVertical: 20,
    alignSelf: 'center',
  },
  forfeitButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  forfeitButtonText: {
    color: '#DC143C',
    fontSize: Math.min(width * 0.045, 16),
    fontWeight: '600',
  },
});