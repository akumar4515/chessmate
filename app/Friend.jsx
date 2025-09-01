import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Modal,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');

export default function FriendsPageRedesigned() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  
  // Modals and animations
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [receivedInvite, setReceivedInvite] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const navigation = useNavigation();
  
  // FIXED: Match your current API URL
  const API_URL = 'http://192.168.243.45:3000';
  
  const socketRef = useRef(null);

  // Game modes configuration
  const GAME_MODES = [
    {
      id: 'blitz',
      name: 'Blitz',
      description: '3 minutes',
      time: 180,
      icon: '⚡',
      color: '#FF6B6B',
      gradient: ['#FF6B6B', '#FF8E8E']
    },
    {
      id: 'rapid',
      name: 'Rapid',
      description: '10 minutes',
      time: 600,
      icon: '🎯',
      color: '#4ECDC4',
      gradient: ['#4ECDC4', '#6BCEC4']
    },
    {
      id: 'classic',
      name: 'Classic',
      description: '30 minutes',
      time: 1800,
      icon: '👑',
      color: '#45B7D1',
      gradient: ['#45B7D1', '#6BC5D1']
    },
    {
      id: 'unlimited',
      name: 'Unlimited',
      description: 'No time limit',
      time: 999999,
      icon: '∞',
      color: '#9B59B6',
      gradient: ['#9B59B6', '#B569C6']
    }
  ];

  useEffect(() => {
    initializeAnimations();
    initializeSocket();
    initialize();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initializeAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
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

  const initializeSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        socketRef.current = io(API_URL, { auth: { token } });
        
        socketRef.current.on('connect', () => {
          console.log('Connected to Socket.IO server in Friends page');
        });

        socketRef.current.on('receiveInvite', (data) => {
          console.log('Received invite:', data);
          setReceivedInvite(data);
          setInviteModalVisible(true);
        });

        // FIXED: Listen for 'gameStarted' instead of 'inviteAccepted'
        socketRef.current.on('gameStarted', (data) => {
          console.log('Game started event received:', data);
          
          // Close all modals
          setInviteModalVisible(false);
          setGameModalVisible(false);
          
          // Navigate to chess game with all required parameters
          navigation.navigate('chessMulti', {
            mode: data.mode,
            initialTime: data.initialTime,
            uid: user.id,
            friendId: user.id === data.whitePlayerId ? data.blackPlayerId : data.whitePlayerId,
            gameId: data.gameId,
            whitePlayerId: data.whitePlayerId,
            blackPlayerId: data.blackPlayerId,
          });
        });

        // FIXED: Handle invite declined properly
        socketRef.current.on('inviteDeclined', ({ reason }) => {
          console.log('Invite declined:', reason);
          setInviteModalVisible(false);
          setGameModalVisible(false);
          
          const message = reason === 'Invitation declined by user' 
            ? 'Player declined your invitation' 
            : 'Invitation expired or failed';
          showMessage(message, 'error');
        });

        socketRef.current.on('inviteSent', (data) => {
          console.log('Invite sent successfully:', data);
        });

        // FIXED: Better error handling
        socketRef.current.on('error', (data) => {
          console.error('Socket error in Friends:', data);
          showMessage(data.message || 'An error occurred', 'error');
          setInviteModalVisible(false);
          setGameModalVisible(false);
        });

        // FIXED: Handle connection errors
        socketRef.current.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          showMessage('Failed to connect to game server', 'error');
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
        });
      }
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  };

  const initialize = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser.guest) {
          setUser(parsedUser);
          await Promise.all([
            fetchFriends(token),
            fetchPendingRequests(token),
            fetchSentRequests(token)
          ]);
        } else {
          showMessage('Guest users cannot access friends feature', 'error');
        }
      } else {
        showMessage('Please log in to access friends', 'error');
      }
    } catch (err) {
      console.error('Initialization error:', err);
      showMessage('Failed to load data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async (token) => {
    const response = await axios.get(`${API_URL}/api/friends`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setFriends(response.data.friends || []);
  };

  const fetchPendingRequests = async (token) => {
    const response = await axios.get(`${API_URL}/api/friend-requests/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setPendingRequests(response.data.requests || []);
  };

  const fetchSentRequests = async (token) => {
    const response = await axios.get(`${API_URL}/api/friend-requests/sent`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSentRequests(response.data.sentRequests || []);
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users/search?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(response.data.users || []);
    } catch (err) {
      showMessage('Failed to search users', 'error');
      setSearchResults([]);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim()) {
      const timeoutId = setTimeout(() => searchUsers(text), 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/friend-request`, 
        { friendId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSearchResults(searchResults.filter(u => u.id !== userId));
      showMessage('Friend request sent successfully', 'success');
      await initialize();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to send friend request', 'error');
    }
  };

  const acceptFriendRequest = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/friend-request/accept`,
        { friendId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showMessage('Friend request accepted', 'success');
      await initialize();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to accept friend request', 'error');
    }
  };

  const cancelFriendRequest = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/friend-request/cancel`,
        { friendId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showMessage('Friend request canceled', 'success');
      await initialize();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to cancel friend request', 'error');
    }
  };

  const inviteFriendToPlay = (friend) => {
    setSelectedFriend(friend);
    setGameModalVisible(true);
  };

  const sendGameInvite = (mode) => {
    const modeConfig = GAME_MODES.find(m => m.id === mode);
    
    if (selectedFriend && socketRef.current) {
      setSelectedMode(mode);
      console.log('Sending game invite:', {
        inviteeId: selectedFriend.id,
        mode: mode,
        initialTime: modeConfig.time
      });
      
      socketRef.current.emit('sendInvite', {
        inviteeId: selectedFriend.id,
        mode: mode,
        initialTime: modeConfig.time
      });
      
      setGameModalVisible(false);
      setInviteModalVisible(true);
    }
  };

  const acceptInvite = () => {
    if (receivedInvite && socketRef.current) {
      console.log('Accepting invite:', receivedInvite.inviteId);
      socketRef.current.emit('acceptInvite', { inviteId: receivedInvite.inviteId });
    }
  };

  const declineInvite = () => {
    if (receivedInvite && socketRef.current) {
      console.log('Declining invite:', receivedInvite.inviteId);
      socketRef.current.emit('declineInvite', { inviteId: receivedInvite.inviteId });
      setInviteModalVisible(false);
      setReceivedInvite(null);
    }
  };

  const showMessage = (message, type) => {
    if (type === 'error') {
      setError(message);
      setSuccessMessage('');
    } else {
      setSuccessMessage(message);
      setError('');
    }
    
    setTimeout(() => {
      setError('');
      setSuccessMessage('');
    }, 3000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  };

  const renderProfilePicture = (item, size = 50) => (
    <View style={[styles.profilePicContainer, { width: size, height: size, borderRadius: size / 2 }]}>
      {item.profile_picture ? (
        <Image 
          source={{ uri: item.profile_picture }} 
          style={[styles.profilePic, { width: size, height: size, borderRadius: size / 2 }]} 
        />
      ) : (
        <View style={[styles.placeholderPic, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>
            {item.username?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderFriendItem = ({ item }) => (
    <Animated.View style={[styles.itemCard, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#2A2A2A', '#1C1C1C']}
        style={styles.itemGradient}
      >
        {renderProfilePicture(item, 60)}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>Online • Ready to play</Text>
        </View>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => inviteFriendToPlay(item)}
        >
          <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.playButtonGradient}>
            <Ionicons name="play" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderSearchResult = ({ item }) => (
    <Animated.View style={[styles.itemCard, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#2A2A2A', '#1C1C1C']}
        style={styles.itemGradient}
      >
        {renderProfilePicture(item, 50)}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>{item.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => sendFriendRequest(item.id)}
        >
          <Ionicons name="person-add" size={20} color="#4ECDC4" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderPendingRequest = ({ item }) => (
    <Animated.View style={[styles.itemCard, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#2A2A2A', '#1C1C1C']}
        style={styles.itemGradient}
      >
        {renderProfilePicture(item, 50)}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>Wants to be friends</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => acceptFriendRequest(item.id)}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => cancelFriendRequest(item.id)}
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderSentRequest = ({ item }) => (
    <Animated.View style={[styles.itemCard, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#2A2A2A', '#1C1C1C']}
        style={styles.itemGradient}
      >
        {renderProfilePicture(item, 50)}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.username}</Text>
          <Text style={styles.itemSubtext}>Request pending</Text>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => cancelFriendRequest(item.id)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderTab = (key, label, icon) => (
    <TouchableOpacity
      key={key}
      style={[styles.tab, activeTab === key && styles.activeTab]}
      onPress={() => setActiveTab(key)}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={activeTab === key ? '#4ECDC4' : '#888'} 
      />
      <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getTabData = () => {
    switch (activeTab) {
      case 'friends':
        return friends;
      case 'search':
        return searchResults;
      case 'pending':
        return pendingRequests;
      case 'sent':
        return sentRequests;
      default:
        return [];
    }
  };

  const getTabRenderer = () => {
    switch (activeTab) {
      case 'friends':
        return renderFriendItem;
      case 'search':
        return renderSearchResult;
      case 'pending':
        return renderPendingRequest;
      case 'sent':
        return renderSentRequest;
      default:
        return renderFriendItem;
    }
  };

  if (!user || user.guest) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
        <View style={styles.guestContainer}>
          <Ionicons name="people-outline" size={80} color="#4ECDC4" />
          <Text style={styles.guestTitle}>Friends Feature</Text>
          <Text style={styles.guestText}>Please log in to connect with friends and play online chess matches.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('User')}>
            <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.loginButtonGradient}>
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Friends</Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Messages */}
      {(error || successMessage) && (
        <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
          <Text style={[styles.messageText, error ? styles.errorText : styles.successText]}>
            {error || successMessage}
          </Text>
        </Animated.View>
      )}

      {/* Tabs */}
      <Animated.View style={[styles.tabContainer, { opacity: fadeAnim }]}>
        {renderTab('friends', `Friends (${friends.length})`, 'people')}
        {renderTab('search', 'Search', 'search')}
        {renderTab('pending', `Requests (${pendingRequests.length})`, 'mail')}
        {renderTab('sent', `Sent (${sentRequests.length})`, 'send')}
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
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
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4ECDC4']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name={activeTab === 'friends' ? 'people-outline' : 
                       activeTab === 'search' ? 'search-outline' : 'mail-outline'} 
                  size={60} 
                  color="#444" 
                />
                <Text style={styles.emptyText}>
                  {activeTab === 'friends' ? 'No friends yet' :
                   activeTab === 'search' ? 'Search for friends' :
                   activeTab === 'pending' ? 'No pending requests' :
                   'No sent requests'}
                </Text>
              </View>
            }
          />
        )}
      </Animated.View>

      {/* Game Mode Selection Modal */}
      <Modal
        visible={gameModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGameModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Game Mode</Text>
              <TouchableOpacity onPress={() => setGameModalVisible(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Playing against {selectedFriend?.username}
            </Text>

            <View style={styles.gameModesContainer}>
              {GAME_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  style={styles.gameModeCard}
                  onPress={() => sendGameInvite(mode.id)}
                >
                  <LinearGradient colors={mode.gradient} style={styles.gameModeGradient}>
                    <Text style={styles.gameModeIcon}>{mode.icon}</Text>
                    <Text style={styles.gameModeName}>{mode.name}</Text>
                    <Text style={styles.gameModeDescription}>{mode.description}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.inviteModalContent, { transform: [{ scale: scaleAnim }] }]}>
            {receivedInvite ? (
              <>
                <Ionicons name="mail" size={50} color="#4ECDC4" />
                <Text style={styles.inviteTitle}>Game Invitation</Text>
                <Text style={styles.inviteMessage}>
                  {receivedInvite.username} invited you to play {receivedInvite.mode}
                </Text>
                <View style={styles.inviteButtons}>
                  <TouchableOpacity style={styles.inviteButton} onPress={acceptInvite}>
                    <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.inviteButtonGradient}>
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
                <ActivityIndicator size="large" color="#4ECDC4" />
                <Text style={styles.inviteTitle}>Sending Invitation</Text>
                <Text style={styles.inviteMessage}>
                  Waiting for {selectedFriend?.username} to respond...
                </Text>
                <TouchableOpacity 
                  style={styles.cancelInviteButton}
                  onPress={() => {
                    setInviteModalVisible(false);
                    setGameModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelInviteButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
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
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestTitle: {
    color: '#EDEDED',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  guestText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    width: 200,
  },
  loginButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    color: '#EDEDED',
    fontSize: 32,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#EDEDED',
    fontSize: 16,
  },
  messageContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1C1C1C',
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF6B6B',
  },
  successText: {
    color: '#4ECDC4',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1C1C1C',
    borderRadius: 15,
    padding: 5,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#2A2A2A',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  activeTabText: {
    color: '#4ECDC4',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 15,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  itemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  profilePicContainer: {
    marginRight: 15,
  },
  profilePic: {
    borderWidth: 2,
    borderColor: '#333',
  },
  placeholderPic: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444',
  },
  placeholderText: {
    color: '#EDEDED',
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#EDEDED',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtext: {
    color: '#888',
    fontSize: 14,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  playButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#4ECDC4',
  },
  declineButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#EDEDED',
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  gameModesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gameModeCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 15,
    overflow: 'hidden',
  },
  gameModeGradient: {
    padding: 20,
    alignItems: 'center',
  },
  gameModeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  gameModeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gameModeDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  inviteModalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  inviteTitle: {
    color: '#EDEDED',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  inviteMessage: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  inviteButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  inviteButton: {
    flex: 1,
    marginRight: 10,
  },
  inviteButtonGradient: {
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineInviteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: '#333',
  },
  declineInviteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelInviteButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelInviteButtonText: {
    color: '#888',
    fontSize: 14,
  },
});