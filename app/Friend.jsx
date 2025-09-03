import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://chessmate-backend-lfxo.onrender.com';

const GAME_MODES = [
  { id: 'blitz', name: 'Blitz', description: '3 minutes', time: 180, icon: '⚡', color: '#FF6B6B', gradient: ['#FF6B6B', '#FF8E8E'] },
  { id: 'rapid', name: 'Rapid', description: '10 minutes', time: 600, icon: '🎯', color: '#4ECDC4', gradient: ['#4ECDC4', '#6BCEC4'] },
  { id: 'classic', name: 'Classic', description: '30 minutes', time: 1800, icon: '👑', color: '#45B7D1', gradient: ['#45B7D1', '#6BC5D1'] },
  { id: 'unlimited', name: 'Unlimited', description: 'No time limit', time: 999999, icon: '∞', color: '#9B59B6', gradient: ['#9B59B6', '#B569C6'] },
];

export default function FriendsPageRedesigned() {
  // session
  const [user, setUser] = useState(null);
  const userIdRef = useRef(null);
  const tokenRef = useRef(null);

  // data
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friendGameStatus, setFriendGameStatus] = useState(new Map());

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

  const navigation = useNavigation();
  const socketRef = useRef(null);

  // animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // message timeout
  const messageTimeoutRef = useRef(null);

  // animate in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // bootstrap (loads user, REST lists, then socket)
  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        if (!token || !userData) {
          showMessage('Please log in to access friends', 'error');
          return;
        }
        tokenRef.current = token;
        const parsed = JSON.parse(userData);
        setUser(parsed);
        userIdRef.current = parsed.id;

        await Promise.all([
          fetchFriends(token),
          fetchPendingRequests(token),
          fetchSentRequests(token),
        ]);

        await initializeSocket(token);
      } catch (e) {
        console.error('Friends bootstrap error:', e);
        showMessage('Failed to load friends. Please try again.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      mounted = false;
      if (socketRef.current) socketRef.current.disconnect();
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, []);

  // refresh on screen focus (critical for restoring Spectate)
  useFocusEffect(
    React.useCallback(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('requestOnlineUsers'); // ask for latest statuses
      } else if (tokenRef.current) {
        initializeSocket(tokenRef.current);
      }
      return () => {};
    }, [])
  );

  // socket setup
  const initializeSocket = async (token) => {
    if (socketRef.current) return;
    socketRef.current = io(API_URL, { auth: { token } });

    socketRef.current.on('onlineUsers', (usersWithStatus) => {
      const map = new Map();
      usersWithStatus.forEach(u => map.set(u.userId, { inGame: u.inGame, gameId: u.gameId }));
      setFriendGameStatus(map);
    });

    socketRef.current.on('friendGameStatus', (data) => {
      setFriendGameStatus(prev => {
        const m = new Map(prev);
        m.set(data.userId, { inGame: data.inGame, gameId: data.gameId });
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
      // use ref so we don’t depend on setUser finishing
      const myId = userIdRef.current;
      if (!myId) return;
      setInviteModalVisible(false);
      setGameModalVisible(false);
      navigation.navigate('chessMulti', {
        mode: data.mode,
        initialTime: data.initialTime,
        uid: myId,
        friendId: myId === data.whitePlayerId ? data.blackPlayerId : data.whitePlayerId,
        gameId: data.gameId,
        whitePlayerId: data.whitePlayerId,
        blackPlayerId: data.blackPlayerId,
      });
    });

    socketRef.current.on('error', (data) => {
      showMessage(data?.message || 'An error occurred', 'error');
      setInviteModalVisible(false);
      setGameModalVisible(false);
    });

    socketRef.current.on('connect_error', () => {
      showMessage('Failed to connect to game server', 'error');
    });
  };

  // REST helpers
  const fetchFriends = async (token) => {
    const res = await axios.get(`${API_URL}/api/friends`, { headers: { Authorization: `Bearer ${token}` } });
    setFriends(res.data.friends || []);
  };
  const fetchPendingRequests = async (token) => {
    const res = await axios.get(`${API_URL}/api/friend-requests/pending`, { headers: { Authorization: `Bearer ${token}` } });
    setPendingRequests(res.data.requests || []);
  };
  const fetchSentRequests = async (token) => {
    const res = await axios.get(`${API_URL}/api/friend-requests/sent`, { headers: { Authorization: `Bearer ${token}` } });
    setSentRequests(res.data.sentRequests || []);
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
    } catch (e) {
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
    const gs = friendGameStatus.get(friend.id);
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
    const gs = friendGameStatus.get(friend.id);
    if (!gs?.inGame || !gs?.gameId) {
      showMessage('Friend is not currently in a game', 'error');
      return;
    }
    const myId = userIdRef.current;
    navigation.navigate('chessMulti', {
      mode: 'spectator',
      gameId: gs.gameId,
      friendId: friend.id,
      uid: myId,
      isSpectator: true,
      spectatorFriendName: friend.username,
    });
  };

  // refresh
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const token = tokenRef.current || (await AsyncStorage.getItem('token'));
      await Promise.all([fetchFriends(token), fetchPendingRequests(token), fetchSentRequests(token)]);
      socketRef.current?.emit('requestOnlineUsers');
    } finally {
      setRefreshing(false);
    }
  };

  // render helpers
  const renderProfilePicture = (item, size = 50) =>
    item.profile_picture ? (
      <Image source={{ uri: `${API_URL}${item.profile_picture}` }} style={[styles.profilePic, { width: size, height: size, borderRadius: size / 2 }]} />
    ) : (
      <View style={[styles.placeholderPic, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.placeholderText}>{item.username?.[0]?.toUpperCase() || 'U'}
</Text>
      </View>
    );

  const renderFriendItem = ({ item }) => {
    const gs = friendGameStatus.get(item.id);
    const inGame = !!gs?.inGame;
    return (
      <View style={styles.itemCard}>
        <LinearGradient colors={['#1C1C1C', '#202020']} style={styles.itemGradient}>
          <View style={styles.profilePicContainer}>{renderProfilePicture(item, 60)}</View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.username}</Text>
            <Text style={[styles.itemSubtext, inGame && styles.inGameStatus]}>{inGame ? '🎮 In Game' : 'Online • Ready to play'}</Text>
          </View>
          {inGame ? (
            <TouchableOpacity onPress={() => spectateGame(item)} style={styles.spectateButton}>
              <LinearGradient colors={['#9B59B6', '#B569C6']} style={styles.spectateButtonGradient}>
                <Ionicons name="eye" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => inviteFriendToPlay(item)} style={styles.playButton}>
              <LinearGradient colors={['#4ECDC4', '#45B7D1']} style={styles.playButtonGradient}>
                <Ionicons name="game-controller" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderSearchResult = ({ item }) => (
    <View style={styles.itemCard}>
      <LinearGradient colors={['#1C1C1C', '#202020']} style={styles.itemGradient}>
        <View style={styles.profilePicContainer}>{renderProfilePicture(item, 50)}</View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>{item.email}</Text>
        </View>
        <TouchableOpacity onPress={() => sendFriendRequest(item.id)} style={styles.addButton}>
          <Ionicons name="person-add" size={18} color="#4ECDC4" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderPendingRequest = ({ item }) => (
    <View style={styles.itemCard}>
      <LinearGradient colors={['#1C1C1C', '#202020']} style={styles.itemGradient}>
        <View style={styles.profilePicContainer}>{renderProfilePicture(item, 50)}</View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>Wants to be friends</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => acceptFriendRequest(item.id)}>
            <Feather name="check" color="#000" size={16} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={() => cancelFriendRequest(item.id)}>
            <Feather name="x" color="#000" size={16} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  const renderSentRequest = ({ item }) => (
    <View style={styles.itemCard}>
      <LinearGradient colors={['#1C1C1C', '#202020']} style={styles.itemGradient}>
        <View style={styles.profilePicContainer}>{renderProfilePicture(item, 50)}</View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>Request pending</Text>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={() => cancelFriendRequest(item.id)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderTab = (key, label, icon) => (
    <TouchableOpacity key={key} onPress={() => setActiveTab(key)} style={[styles.tab, activeTab === key && styles.activeTab]}>
      <Ionicons name={icon} size={16} color={activeTab === key ? '#4ECDC4' : '#888'} />
      <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>{label}</Text>
    </TouchableOpacity>
  );

  const getTabData = () => {
    switch (activeTab) {
      case 'friends': return friends;
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.guestContainer}>
          <Text style={styles.guestTitle}>Friends Feature</Text>
          <Text style={styles.guestText}>Please log in to connect with friends and play online chess matches.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('User')} style={styles.loginButton}>
            <LinearGradient colors={['#4ECDC4', '#45B7D1']} style={styles.loginButtonGradient}>
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
            <Text style={styles.headerTitle}>Friends</Text>
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
            <TextInput
              placeholder="Search by name or email"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Feather name="x-circle" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {(error || successMessage) && (
          <View style={styles.messageContainer}>
            <Text style={[styles.messageText, error ? styles.errorText : styles.successText]}>
              {error || successMessage}
            </Text>
          </View>
        )}

        <View style={styles.tabContainer}>
          {renderTab('friends', `Friends (${friends.length})`, 'people')}
          {renderTab('search', 'Search', 'search')}
          {renderTab('pending', `Requests (${pendingRequests.length})`, 'mail')}
          {renderTab('sent', `Sent (${sentRequests.length})`, 'send')}
        </View>

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
            refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />}
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

        <Modal visible={gameModalVisible} animationType="slide" transparent onRequestClose={() => setGameModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Game Mode</Text>
                <TouchableOpacity onPress={() => setGameModalVisible(false)}>
                  <Feather name="x" color="#EDEDED" size={20} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Playing against {selectedFriend?.username}</Text>
              <View style={styles.gameModesContainer}>
                {GAME_MODES.map((m) => (
                  <TouchableOpacity key={m.id} style={styles.gameModeCard} onPress={() => sendGameInvite(m.id)}>
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

        <Modal visible={inviteModalVisible} animationType="fade" transparent onRequestClose={() => setInviteModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.inviteModalContent}>
              {receivedInvite ? (
                <>
                  <Text style={styles.inviteTitle}>Game Invitation</Text>
                  <Text style={styles.modalSubtitle}>
                    {receivedInvite.username} invited you to play {receivedInvite.mode}
                  </Text>
                  <View style={styles.inviteButtons}>
                    <TouchableOpacity style={styles.inviteButton} onPress={acceptInvite}>
                      <LinearGradient colors={['#4ECDC4', '#45B7D1']} style={styles.inviteButtonGradient}>
                        <Text style={styles.inviteButtonText}>Accept</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineInviteButton} onPress={declineInvite}>
                      <Text style={styles.declineInviteButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.inviteTitle}>Sending Invitation</Text>
                  <Text style={styles.modalSubtitle}>Waiting for {selectedFriend?.username} to respond...</Text>
                  <TouchableOpacity style={styles.cancelInviteButton} onPress={() => { setInviteModalVisible(false); setGameModalVisible(false); }}>
                    <Text style={styles.cancelInviteButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 35, backgroundColor: '#0F0F0F' },
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  guestTitle: { color: '#EDEDED', fontSize: 28, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  guestText: { color: '#888', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  loginButton: { width: 200 },
  loginButtonGradient: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, alignItems: 'center' },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  header: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { color: '#EDEDED', fontSize: 32, fontWeight: 'bold' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1C', borderRadius: 15, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#333' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#EDEDED', fontSize: 16 },

  messageContainer: { marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 10, backgroundColor: '#1C1C1C' },
  messageText: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
  errorText: { color: '#FF6B6B' },
  successText: { color: '#4ECDC4' },

  tabContainer: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#1C1C1C', borderRadius: 15, padding: 5, marginBottom: 15 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  activeTab: { backgroundColor: '#2A2A2A' },
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
  placeholderText: { color: '#EDEDED', fontWeight: 'bold', fontSize: 20 },

  itemInfo: { flex: 1 },
  itemName: { color: '#EDEDED', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  itemSubtext: { color: '#888', fontSize: 14 },
  inGameStatus: { color: '#9B59B6', fontWeight: '600' },

  playButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  playButtonGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  spectateButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  spectateButtonGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
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
