// Friend.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import io from 'socket.io-client';
import { ClickSoundContext } from './clickSound';
const { width } = Dimensions.get('window');
const API_URL = 'https://chessmate-backend-lfxo.onrender.com';

const GAME_MODES = [
  { id: 'blitz', name: 'Blitz', description: '30 second', time: 30, icon: '⚡', color: '#FF6B6B', gradient: ['#FF6B6B', '#FF8E8E'] },
  { id: 'rush', name: 'Rush', description: '20s minutes', time: 20, icon: '🎯', color: '#4ECDC4', gradient: ['#4ECDC4', '#6BCEC4'] },
  { id: 'classic', name: 'Classic', description: '60second', time: 60, icon: '👑', color: '#45B7D1', gradient: ['#45B7D1', '#6BC5D1'] },
  { id: 'unlimited', name: 'Unlimited', description: 'No time limit', time: 999999, icon: '∞', color: '#9B59B6', gradient: ['#9B59B6', '#B569C6'] },
];

// Global cache for friends data
let friendsDataCache = {
  friends: null,
  pendingRequests: null,
  sentRequests: null,
  user: null
};
let isRefreshing = false;

export default function FriendsPageRedesigned() {
  // session
  const [user, setUser] = useState(friendsDataCache.user);
  const clickSoundContext = React.useContext(ClickSoundContext);
  const userIdRef = useRef(null);
  const tokenRef = useRef(null);

  // data
  const [friends, setFriends] = useState(friendsDataCache.friends || []);
  const [pendingRequests, setPendingRequests] = useState(friendsDataCache.pendingRequests || []);
  const [sentRequests, setSentRequests] = useState(friendsDataCache.sentRequests || []);
  const [friendGameStatus, setFriendGameStatus] = useState(new Map());
  const [friendSpectatingStatus, setFriendSpectatingStatus] = useState(new Map());
  const [sortedFriends, setSortedFriends] = useState([]);

  // UI
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // invites
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [receivedInvite, setReceivedInvite] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);

  // chat modal (NEW)
  const [chatVisible, setChatVisible] = useState(false);
  const [chatFriend, setChatFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const router = useRouter();
  const socketRef = useRef(null);

  // animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const messageTimeoutRef = useRef(null);

  // Function to sort friends by online status
  const sortFriendsByOnlineStatus = (friendsList, gameStatusMap) => {
    return [...friendsList].sort((a, b) => {
      const aOnline = gameStatusMap.has(String(a.id));
      const bOnline = gameStatusMap.has(String(b.id));
      
      // Online users first
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      
      // If both online or both offline, sort alphabetically by username
      return a.username.localeCompare(b.username);
    });
  };

  // Update sorted friends when friends list or game status changes
  useEffect(() => {
    const sorted = sortFriendsByOnlineStatus(friends, friendGameStatus);
    setSortedFriends(sorted);
  }, [friends, friendGameStatus]);

  // animate in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // bootstrap
  useEffect(() => {
    let mounted = true;
    const initializeFriendsData = async () => {
      // If we have cached data, show it immediately and refresh in background
      if (friendsDataCache.user && friendsDataCache.friends) {
        setUser(friendsDataCache.user);
        setFriends(friendsDataCache.friends);
        setPendingRequests(friendsDataCache.pendingRequests || []);
        setSentRequests(friendsDataCache.sentRequests || []);
        userIdRef.current = friendsDataCache.user.id;
        
        // Refresh data in background without showing loading
        refreshFriendsData(false);
      } else {
        // No cached data, show loading and fetch data
        refreshFriendsData(true);
      }
    };
    
    initializeFriendsData();
    return () => {
      mounted = false;
      if (socketRef.current) socketRef.current.disconnect();
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, []);

  // refresh on focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Friend page focused, checking socket connection...');
      
      // Only refresh if we already have user data (not on initial load)
      if (friendsDataCache.user && user) {
        refreshFriendsData(false);
      }
      
      if (socketRef.current?.connected) {
        console.log('✅ Socket is connected, requesting online users...');
        socketRef.current.emit('requestOnlineUsers');
      } else {
        console.log('❌ Socket not connected, reinitializing...');
        if (tokenRef.current) {
          initializeSocket(tokenRef.current);
        }
      }
      return () => {};
    }, [user])
  );

  // socket setup
  const initializeSocket = async (token) => {
    // Only create new socket if we don't have one or it's disconnected
    if (socketRef.current && socketRef.current.connected) {
      console.log('✅ Socket already connected, skipping initialization');
      return;
    }
    
    // Disconnect existing socket if it exists
    if (socketRef.current) {
      console.log('🔄 Disconnecting existing socket...');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    console.log('🔄 Creating new socket connection...');
    socketRef.current = io(API_URL, { auth: { token } });

    socketRef.current.on('onlineUsers', (usersWithStatus) => {
      console.log('📊 Received online users:', usersWithStatus);
      const map = new Map();
      usersWithStatus.forEach(u => map.set(u.userId, { inGame: u.inGame, gameId: u.gameId }));
      console.log('🗺️ Updated friend game status map:', Array.from(map.entries()));
      setFriendGameStatus(map);
    });

    socketRef.current.on('friendGameStatus', (data) => {
      setFriendGameStatus(prev => {
        const m = new Map(prev);
        m.set(data.userId, { inGame: data.inGame, gameId: data.gameId });
        return m;
      });
    });

    // Listen for spectator status updates
    socketRef.current.on('friendSpectatingStatus', (data) => {
      console.log('👁️ Friend spectating status update:', data);
      setFriendSpectatingStatus(prev => {
        const m = new Map(prev);
        if (data.isSpectating) {
          m.set(data.userId, { 
            isSpectating: true, 
            gameId: data.gameId, 
            spectatingPlayer: data.spectatingPlayer 
          });
          console.log(`👁️ Added spectating status for user ${data.userId}`);
        } else {
          m.delete(data.userId);
          console.log(`👁️ Removed spectating status for user ${data.userId}`);
        }
        console.log('👁️ Updated spectating status map:', Array.from(m.entries()));
        return m;
      });
    });

    socketRef.current.on('receiveInvite', (payload) => {
      setReceivedInvite(payload);
      setInviteModalVisible(true);
    });

    socketRef.current.on('inviteDeclined', ({ reason }) => {
      setInviteModalVisible(false);
      setGameModalVisible(false);
      const msg = reason === 'Invitation declined by user' ? 'Player declined your invitation' : 'Invitation expired or failed';
      showMessage(msg, 'error');
    });

    socketRef.current.on('gameStarted', (data) => {
      const myId = userIdRef.current;
      if (!myId) return;
      setInviteModalVisible(false);
      setGameModalVisible(false);
      router.push({
        pathname: '/chessMulti',
        params: {
          mode: data.mode,
          initialTime: data.initialTime,
          uid: myId,
          friendId: myId === data.whitePlayerId ? data.blackPlayerId : data.whitePlayerId,
          gameId: data.gameId,
          whitePlayerId: data.whitePlayerId,
          blackPlayerId: data.blackPlayerId,
        }
      });
    });

    socketRef.current.on('error', (data) => {
      showMessage(data?.message || 'An error occurred', 'error');
      setInviteModalVisible(false);
      setGameModalVisible(false);
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected to friends server');
      // Request online users immediately after connection
      socketRef.current.emit('requestOnlineUsers');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      // Clear online status when disconnected
      setFriendGameStatus(new Map());
    });

    socketRef.current.on('reconnect', () => {
      // Request online users after reconnection
      socketRef.current.emit('requestOnlineUsers');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      showMessage('Failed to connect to friends server', 'error');
    });

    // NEW: chat live listener
 socketRef.current.on('chatMessage', (m) => {
  if (!chatFriend) return;
  const mine = userIdRef.current;
  if (m.senderId === chatFriend.id || m.senderId === mine) {
    setChatMessages((prev) => [...prev, m]);  // ✅
  }
});

    // optional badge event
    socketRef.current.on('chatBadge', ({ fromUserId }) => {
      // implement unread badge if needed
    });
  };

  // REST helpers
  const fetchFriends = async (token) => {
    const res = await axios.get(`${API_URL}/api/friends`, { headers: { Authorization: `Bearer ${token}` } });
    const friendsData = res.data.friends || [];
    friendsDataCache.friends = friendsData;
    setFriends(friendsData);
  };

  const fetchPendingRequests = async (token) => {
    const res = await axios.get(`${API_URL}/api/friend-requests/pending`, { headers: { Authorization: `Bearer ${token}` } });
    const pendingData = res.data.requests || [];
    friendsDataCache.pendingRequests = pendingData;
    setPendingRequests(pendingData);
  };

  const fetchSentRequests = async (token) => {
    const res = await axios.get(`${API_URL}/api/friend-requests/sent`, { headers: { Authorization: `Bearer ${token}` } });
    const sentData = res.data.sentRequests || [];
    friendsDataCache.sentRequests = sentData;
    setSentRequests(sentData);
  };

  // messages
  const showMessage = (message, type) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    if (type === 'error') {
      setError(message);
      setSuccessMessage('');
    } else {
      setSuccessMessage(message);
      setError('');
    }
    messageTimeoutRef.current = setTimeout(() => {
      setError('');
      setSuccessMessage('');
      messageTimeoutRef.current = null;
    }, 3000);
  };

  // Function to refresh friends data in background
  const refreshFriendsData = async (showLoading = false) => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes
    
    try {
      isRefreshing = true;
      if (showLoading) setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (!token || !userData) {
        // Clear cache if no auth data
        friendsDataCache = { friends: null, pendingRequests: null, sentRequests: null, user: null };
        setUser(null);
        setFriends([]);
        setPendingRequests([]);
        setSentRequests([]);
        return;
      }

      tokenRef.current = token;
      const parsed = JSON.parse(userData);
      
      // Update user data
      friendsDataCache.user = parsed;
      setUser(parsed);
      userIdRef.current = parsed.id;

      // Fetch all friends data
      await Promise.all([
        fetchFriends(token),
        fetchPendingRequests(token),
        fetchSentRequests(token),
      ]);

      // Initialize socket
      await initializeSocket(token);
      
    } catch (e) {
      console.error('Background refresh error:', e);
      if (showLoading) {
        showMessage('Failed to load friends. Please try again.', 'error');
      }
    } finally {
      isRefreshing = false;
      if (showLoading) setLoading(false);
    }
  };

  // search
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const token = tokenRef.current || (await AsyncStorage.getItem('token'));
      const res = await axios.get(`${API_URL}/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data.users || []);
    } catch {
      showMessage('Failed to search users', 'error');
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => searchUsers(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // friend requests
  const sendFriendRequest = async (friendId) => {
    try {
      const token = tokenRef.current || (await AsyncStorage.getItem('token'));
      await axios.post(`${API_URL}/api/friend-request`, { friendId }, { headers: { Authorization: `Bearer ${token}` } });
      setSearchResults(prev => prev.filter(u => u.id !== friendId));
      showMessage('Friend request sent successfully', 'success');
      await Promise.all([fetchFriends(token), fetchPendingRequests(token), fetchSentRequests(token)]);
    } catch (e) {
      showMessage(e.response?.data?.message || 'Failed to send friend request', 'error');
    }
  };

  const acceptFriendRequest = async (friendId) => {
    try {
      const token = tokenRef.current || (await AsyncStorage.getItem('token'));
      await axios.post(`${API_URL}/api/friend-request/accept`, { friendId }, { headers: { Authorization: `Bearer ${token}` } });
      showMessage('Friend request accepted', 'success');
      await Promise.all([fetchFriends(token), fetchPendingRequests(token), fetchSentRequests(token)]);
    } catch (e) {
      showMessage(e.response?.data?.message || 'Failed to accept friend request', 'error');
    }
  };

  const cancelFriendRequest = async (friendId) => {
    try {
      const token = tokenRef.current || (await AsyncStorage.getItem('token'));
      await axios.post(`${API_URL}/api/friend-request/cancel`, { friendId }, { headers: { Authorization: `Bearer ${token}` } });
      showMessage('Friend request canceled', 'success');
      await Promise.all([fetchFriends(token), fetchPendingRequests(token), fetchSentRequests(token)]);
    } catch (e) {
      showMessage(e.response?.data?.message || 'Failed to cancel friend request', 'error');
    }
  };

  // invites
  const inviteFriendToPlay = (friend) => {
    const friendIdStr = String(friend.id);
    const gs = friendGameStatus.get(friendIdStr);
    if (gs?.inGame) {
      showMessage('Player is currently in a game', 'error');
      return;
    }
    setSelectedFriend(friend);
    setGameModalVisible(true);
  };

  const sendGameInvite = (modeId) => {
    const cfg = GAME_MODES.find(m => m.id === modeId);
    if (!socketRef.current || !selectedFriend || !cfg) return;
    setSelectedMode(modeId);
    socketRef.current.emit('sendInvite', { inviteeId: selectedFriend.id, mode: modeId, initialTime: cfg.time });
    setGameModalVisible(false);
    setInviteModalVisible(true);
  };

  const acceptInvite = () => {
    if (!receivedInvite || !socketRef.current) return;
    socketRef.current.emit('acceptInvite', { inviteId: receivedInvite.inviteId });
  };

  const declineInvite = () => {
    if (!receivedInvite || !socketRef.current) return;
    socketRef.current.emit('declineInvite', { inviteId: receivedInvite.inviteId });
    setInviteModalVisible(false);
    setReceivedInvite(null);
  };

  // spectate
  const spectateGame = (friend) => {
    const friendIdStr = String(friend.id);
    const gs = friendGameStatus.get(friendIdStr);
    if (!gs?.inGame || !gs?.gameId) {
      showMessage('Friend is not currently in a game', 'error');
      return;
    }
    
    // Check if both players are still in the game
    // We need to check if there are at least 2 players in the game
    let playerCount = 0;
    friendGameStatus.forEach((status, id) => {
      if (status.gameId === gs.gameId && status.inGame) {
        playerCount++;
      }
    });
    
    if (playerCount < 2) {
      showMessage('Cannot spectate: Only one player remains in the game', 'error');
      return;
    }
    
    const myId = userIdRef.current;
    router.push({
      pathname: '/chessMulti',
      params: {
        mode: 'spectator',
        gameId: gs.gameId,
        friendId: friend.id,
        uid: myId,
        isSpectator: true,
        spectatorFriendName: friend.username,
      }
    });
  };

  // chat open/close/send (NEW)
  const openChat = async (friend) => {
    try {
      setChatFriend(friend);
      setChatVisible(true);
      const token = tokenRef.current || (await AsyncStorage.getItem('token'));
      const res = await axios.get(`${API_URL}/api/chat/history/${friend.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages(res.data.messages || []);
      socketRef.current?.emit('joinChat', { friendId: friend.id });
    } catch {
      showMessage('Failed to load chat history', 'error');
    }
  };

  const closeChat = () => {
    if (chatFriend) socketRef.current?.emit('leaveChat', { friendId: chatFriend.id });
    setChatVisible(false);
    setChatFriend(null);
  };

  const sendChat = () => {
    if (!chatInput.trim() || !chatFriend) return;
    const mine = userIdRef.current;
    const tempId = Date.now();
    const optimistic = {
      id: tempId,
      senderId: mine,
      receiverId: chatFriend.id,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
      senderUsername: user?.username,
    };
setChatMessages((prev) => [...prev, optimistic]); // ✅
    socketRef.current?.emit('sendChat', { toUserId: chatFriend.id, message: chatInput.trim(), tempId }, (ack) => {
      if (!ack?.ok) showMessage(ack?.error || 'Send failed', 'error');
    });
    setChatInput('');
  };

  // refresh
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshFriendsData(false);
      socketRef.current?.emit('requestOnlineUsers');
    } finally {
      setRefreshing(false);
    }
  };

  // render helpers
  const renderProfilePicture = (item, size = 50, isOnline = false) =>
    item.profile_picture ? (
      <Image source={{ uri: item.profile_picture }} style={[
        styles.profilePic, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          borderColor: isOnline ? '#4ECDC4' : '#333',
          borderWidth: isOnline ? 3 : 2
        }
      ]} />
    ) : (
      <View style={[
        styles.placeholderPic, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          borderColor: isOnline ? '#4ECDC4' : '#444',
          borderWidth: isOnline ? 3 : 2
        }
      ]}>
        <Text style={styles.placeholderText}>{item.username[0]?.toUpperCase() || 'U'}</Text>
      </View>
    );

  const renderFriendItem = ({ item }) => {
    // Convert friend ID to string to match the map keys
    const friendIdStr = String(item.id);
    const gs = friendGameStatus.get(friendIdStr);
    const spectatingStatus = friendSpectatingStatus.get(friendIdStr);
    const isOnline = friendGameStatus.has(friendIdStr);
    const inGame = !!gs?.inGame;
    const isSpectating = !!spectatingStatus?.isSpectating;
    
    console.log(`👤 Friend ${item.username} (ID: ${item.id}, string: ${friendIdStr}):`, {
      isOnline,
      inGame,
      isSpectating,
      gameStatus: gs,
      spectatingStatus,
      friendGameStatusSize: friendGameStatus.size,
      spectatingStatusSize: friendSpectatingStatus.size,
      allOnlineUserIds: Array.from(friendGameStatus.keys()),
      allSpectatingUserIds: Array.from(friendSpectatingStatus.keys())
    });
    
    let statusText = 'Offline';
    let statusStyle = styles.offlineStatus;
    
    if (isOnline) {
      if (isSpectating) {
        statusText = '👁️ Spectating...';
        statusStyle = styles.spectatingStatus;
      } else if (inGame) {
        statusText = '🎮 In Game';
        statusStyle = styles.inGameStatus;
      } else {
        statusText = '🟢 Online';
        statusStyle = styles.onlineStatus;
      }
    }
    
    return (
      <View style={styles.itemCard}>
        <LinearGradient colors={['#1C1C1C', '#151515']} style={styles.itemGradient}>
          <View style={styles.profilePicContainer}>{renderProfilePicture(item, 60, isOnline)}</View>
          <View style={styles.itemInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.itemName}>{item.username}</Text>
              {isOnline && (
                <View style={styles.onlineIndicator}>
                  <View style={styles.onlineDot} />
                </View>
              )}
            </View>
            <Text style={[styles.itemSubtext, statusStyle]}>{statusText}</Text>
          </View>
          {/* Play/Spectate */}
          {isOnline && inGame && !isSpectating ? (
            (() => {
              // Check if both players are still in the game
              const friendIdStr = String(item.id);
              const gs = friendGameStatus.get(friendIdStr);
              let playerCount = 0;
              if (gs?.gameId) {
                friendGameStatus.forEach((status, id) => {
                  if (status.gameId === gs.gameId && status.inGame) {
                    playerCount++;
                  }
                });
              }
              
              // Only show spectate button if both players are in the game
              return playerCount >= 2 ? (
                <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), spectateGame(item)}} style={styles.spectateButton}>
                  <LinearGradient colors={['#9B59B6', '#B569C6']} style={styles.spectateButtonGradient}>
                    <Feather name="eye" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.inGameButton}>
                  <LinearGradient colors={['#666666', '#555555']} style={styles.spectateButtonGradient}>
                    <Feather name="users" size={18} color="#fff" />
                  </LinearGradient>
                </View>
              );
            })()
          ) : isOnline && !inGame && !isSpectating ? (
            <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), inviteFriendToPlay(item)}} style={styles.playButton}>
              <LinearGradient colors={['#4ECDC4', '#6BCEC4']} style={styles.playButtonGradient}>
                <Feather name="play" size={18} color="#0F0F0F" />
              </LinearGradient>
            </TouchableOpacity>
          ) : isOnline && isSpectating ? (
            <View style={styles.spectatingButton}>
              <LinearGradient colors={['#FFA500', '#FFB84D']} style={styles.spectatingButtonGradient}>
                <Feather name="eye" size={18} color="#fff" />
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.offlineButton}>
              <Feather name="user-x" size={18} color="#666" />
            </View>
          )}
          {/* NEW: Message button */}
          <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), openChat(item)}} style={[styles.addButton, { marginLeft: 8 }]}>
            <Feather name="message-circle" size={18} color="#4ECDC4" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderSearchResult = ({ item }) => (
    <View style={styles.itemCard}>
      <LinearGradient colors={['#1C1C1C', '#151515']} style={styles.itemGradient}>
        <View style={styles.profilePicContainer}>{renderProfilePicture(item, 50, false)}</View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>{item.email}</Text>
        </View>
        <TouchableOpacity onPress={() => {clickSoundContext?.playClick?.(),sendFriendRequest(item.id)}} style={styles.addButton}>
          <Feather name="user-plus" size={18} color="#4ECDC4" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderPendingRequest = ({ item }) => (
    <View style={styles.itemCard}>
      <LinearGradient colors={['#1C1C1C', '#151515']} style={styles.itemGradient}>
        <View style={styles.profilePicContainer}>{renderProfilePicture(item, 50, false)}</View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>Wants to be friends</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), acceptFriendRequest(item.id)}} style={[styles.actionButton, styles.acceptButton]}>
            <Feather name="check" size={16} color="#0F0F0F" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), cancelFriendRequest(item.id)}} style={[styles.actionButton, styles.declineButton]}>
            <Feather name="x" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  const renderSentRequest = ({ item }) => (
    <View style={styles.itemCard}>
      <LinearGradient colors={['#1C1C1C', '#151515']} style={styles.itemGradient}>
        <View style={styles.profilePicContainer}>{renderProfilePicture(item, 50, false)}</View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>Request pending</Text>
        </View>
        <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), cancelFriendRequest(item.id)}} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderTab = (key, label, icon) => (
    <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), setActiveTab(key)}} style={[styles.tab, activeTab === key && styles.activeTab]}>
      <Feather name={icon} size={14} color={activeTab === key ? '#4ECDC4' : '#888'} />
      <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>{label}</Text>
    </TouchableOpacity>
  );

  const getTabData = () => {
    switch (activeTab) {
      case 'friends': return sortedFriends;
      case 'search': return searchResults;
      case 'pending': return pendingRequests;
      case 'sent': return sentRequests;
      default: return [];
    }
  };

  const getTabRenderer = () => {
    switch (activeTab) {
      case 'friends': return renderFriendItem;
      case 'search': return renderSearchResult;
      case 'pending': return renderPendingRequest;
      case 'sent': return renderSentRequest;
      default: return renderFriendItem;
    }
  };

  if (!user || user.guest) {
    return (
      <SafeAreaView style={styles.guestContainer}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="people-outline" size={64} color="#4ECDC4" />
        <Text style={styles.guestTitle}>Friends Feature</Text>
        <Text style={styles.guestText}>Please log in to connect with friends and play online chess matches.</Text>
        <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), router.push('/User')}} style={styles.loginButton}>
          <LinearGradient colors={['#4ECDC4', '#45B7D1']} style={styles.loginButtonGradient}>
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(text) => { setSearchQuery(text); if (activeTab !== 'search') setActiveTab('search'); }}
            placeholder="Search users by name or email"
            placeholderTextColor="#666"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {clickSoundContext?.playClick?.(), setSearchQuery(''); setSearchResults([]); }}>
              <Feather name="x" size={16} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages */}
      {(error || successMessage) && (
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, error ? styles.errorText : styles.successText]}>{error || successMessage}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTab('friends', `Friends (${friends.length})`, 'users')}
        {renderTab('search', 'Search', 'search')}
        {renderTab('pending', `Requests (${pendingRequests.length})`, 'mail')}
        {renderTab('sent', `Sent (${sentRequests.length})`, 'send')}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={getTabData()}
          keyExtractor={(item) => item.id.toString()}
          renderItem={getTabRenderer()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ECDC4" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'friends' ? 'No friends yet' :
                 activeTab === 'search' ? 'Search for friends' :
                 activeTab === 'pending' ? 'No pending requests' : 'No sent requests'}
              </Text>
            </View>
          }
        />
      )}

      {/* Game Mode Modal */}
      <Modal visible={gameModalVisible} transparent animationType="fade" onRequestClose={() => setGameModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Game Mode</Text>
              <TouchableOpacity onPress={() =>{clickSoundContext?.playClick?.(), setGameModalVisible(false)}}><Feather name="x" size={18} color="#EDEDED" /></TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Playing against {selectedFriend?.username}</Text>
            <View style={styles.gameModesContainer}>
              {GAME_MODES.map((m) => (
                <TouchableOpacity key={m.id} onPress={() =>{clickSoundContext?.playClick?.(), sendGameInvite(m.id)}} style={styles.gameModeCard}>
                  <LinearGradient colors={m.gradient} style={styles.gameModeGradient}>
                    <Text style={styles.gameModeIcon}>{m.icon}</Text>
                    <Text style={styles.gameModeName}>{m.name}</Text>
                    <Text style={styles.gameModeDescription}>{m.description}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={inviteModalVisible} transparent animationType="fade" onRequestClose={() =>{clickSoundContext?.playClick?.(), setInviteModalVisible(false)}}>
        <View style={styles.modalContainer}>
          <View style={styles.inviteModalContent}>
            {receivedInvite ? (
              <>
                <Ionicons name="game-controller-outline" size={48} color="#4ECDC4" />
                <Text style={styles.inviteTitle}>Game Invitation</Text>
                <Text style={{ color: '#AAA', marginBottom: 20 }}>{receivedInvite.username} invited you to play {receivedInvite.mode}</Text>
                <View style={styles.inviteButtons}>
                  <TouchableOpacity onPress={()=>{clickSoundContext?.playClick?.(),acceptInvite()}} style={styles.inviteButton}>
                    <LinearGradient colors={['#4ECDC4', '#45B7D1']} style={styles.inviteButtonGradient}>
                      <Text style={styles.inviteButtonText}>Accept</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={()=>{clickSoundContext?.playClick?.(),declineInvite()}} style={styles.declineInviteButton}>
                    <Text style={styles.declineInviteButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="time" size={48} color="#EDEDED" />
                <Text style={styles.inviteTitle}>Sending Invitation</Text>
                <Text style={{ color: '#AAA', marginBottom: 10 }}>Waiting for {selectedFriend?.username} to respond...</Text>
                <TouchableOpacity onPress={() => {clickSoundContext?.playClick?.(),setInviteModalVisible(false); setGameModalVisible(false); }} style={styles.cancelInviteButton}>
                  <Text style={styles.cancelInviteButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Chat Modal (NEW) */}
      <Modal visible={chatVisible} transparent animationType="fade" onRequestClose={()=>{clickSoundContext?.playClick?.(),closeChat()}}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat with {chatFriend?.username}</Text>
              <TouchableOpacity onPress={()=>{clickSoundContext?.playClick?.(),closeChat()}}><Feather name="x" size={20} color="#EDEDED" /></TouchableOpacity>
            </View>
            <FlatList
              data={chatMessages}
              keyExtractor={(m) => String(m.id)}
              contentContainerStyle={{ paddingVertical: 10 }}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <View style={{ alignSelf: item.senderId === userIdRef.current ? 'flex-end' : 'flex-start', backgroundColor: '#1C1C1C', padding: 8, borderRadius: 8, marginVertical: 4, maxWidth: '80%' }}>
                  <Text style={{ color: '#EDEDED' }}>{item.message}</Text>
                  <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                </View>
              )}
            />
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message"
                placeholderTextColor="#777"
                style={{ flex: 1, color: '#EDEDED', backgroundColor: '#1C1C1C', borderRadius: 10, paddingHorizontal: 12, height: 44 }}
              />
              <TouchableOpacity onPress={()=>{clickSoundContext?.playClick?.(),sendChat()}} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333', borderRadius: 10, marginLeft: 8 }}>
                <Feather name="send" size={18} color="#4ECDC4" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F',paddingTop: 30, },
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, backgroundColor: '#0F0F0F' },
  guestTitle: { color: '#EDEDED', fontSize: 28, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  guestText: { color: '#888', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  loginButton: { width: 200 },
  loginButtonGradient: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, alignItems: 'center' },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  header: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { color: '#EDEDED', fontSize: 32, fontWeight: 'bold', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1C', borderRadius: 15, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#333' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#EDEDED', fontSize: 16 },
  messageContainer: { marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 10, backgroundColor: '#1C1C1C' },
  messageText: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
  errorText: { color: '#FF6B6B' },
  successText: { color: '#4ECDC4' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1C1C1C', borderRadius: 15, padding: 5, marginBottom: 15 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  // activeTab: { backgroundColor: '#2A2A2A' },
  tabText: { color: '#888', fontSize: 12, fontWeight: '600', marginLeft: 5 },
  activeTabText: { color: '#4ECDC4' },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', fontSize: 16, marginTop: 10 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 15 },
  itemCard: { marginBottom: 12, borderRadius: 15, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  itemGradient: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  profilePicContainer: { marginRight: 15 },
  profilePic: { borderWidth: 2, borderColor: '#333' },
  placeholderPic: { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#444' },
  placeholderText: { color: '#EDEDED', fontWeight: 'bold' },
  itemInfo: { flex: 1 },
  itemName: { color: '#EDEDED', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  onlineIndicator: { marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ECDC4' },
  itemSubtext: { color: '#888', fontSize: 14 },
  inGameStatus: { color: '#9B59B6', fontWeight: '600' },
  spectatingStatus: { color: '#FFA500', fontWeight: '600' },
  onlineStatus: { color: '#4ECDC4', fontWeight: '600' },
  offlineStatus: { color: '#666', fontWeight: '500' },
  offlineButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  playButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  playButtonGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  spectateButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  spectateButtonGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  spectatingButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  spectatingButtonGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  inGameButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4ECDC4' },
  actionButtons: { flexDirection: 'row' },
  actionButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  acceptButton: { backgroundColor: '#4ECDC4' },
  declineButton: { backgroundColor: '#FF6B6B' },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 15, backgroundColor: '#333' },
  cancelButtonText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#1C1C1C', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: '#EDEDED', fontSize: 20, fontWeight: 'bold' },
  modalSubtitle: { color: '#888', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  gameModesContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gameModeCard: { width: '48%', marginBottom: 12, borderRadius: 15, overflow: 'hidden' },
  gameModeGradient: { padding: 20, alignItems: 'center' },
  gameModeIcon: { fontSize: 32, marginBottom: 8 },
  gameModeName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  gameModeDescription: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  inviteModalContent: { width: '100%', maxWidth: 320, backgroundColor: '#1C1C1C', borderRadius: 20, padding: 30, alignItems: 'center' },
  inviteTitle: { color: '#EDEDED', fontSize: 22, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  inviteButtons: { flexDirection: 'row', width: '100%' },
  inviteButton: { flex: 1, marginRight: 10 },
  inviteButtonGradient: { paddingVertical: 12, borderRadius: 15, alignItems: 'center' },
  inviteButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  declineInviteButton: { flex: 1, paddingVertical: 12, borderRadius: 15, alignItems: 'center', backgroundColor: '#333' },
  declineInviteButtonText: { color: '#FF6B6B', fontSize: 16, fontWeight: '600' },
  cancelInviteButton: { marginTop: 15, paddingVertical: 10, paddingHorizontal: 20 },
  cancelInviteButtonText: { color: '#888', fontSize: 14 },
});
