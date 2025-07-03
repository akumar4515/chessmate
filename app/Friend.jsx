import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SectionList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');

export default function Friend() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentPendingRequests, setSentPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [searchButtonScale] = useState(new Animated.Value(1));
  const [searchLoading, setSearchLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [receivedInvite, setReceivedInvite] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null); // New state for game mode
  const navigation = useNavigation();
  const API_URL = 'http://192.168.243.45:3000';
  const socketRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Initialize Socket.IO
    AsyncStorage.getItem('token').then((token) => {
      if (token) {
        socketRef.current = io(API_URL, {
          auth: { token },
        });

        socketRef.current.on('connect', () => {
          console.log('Connected to Socket.IO server');
        });

        socketRef.current.on('receiveInvite', (data) => {
          setReceivedInvite(data);
          setInviteModalVisible(true);
        });

        socketRef.current.on('inviteAccepted', ({ gameId, board, turn, mode, initialTime }) => {
          setInviteModalVisible(false);
          setSelectedMode(null); // Clear mode after acceptance
          navigation.navigate('chessMulti', {
            mode,
            initialTime,
            uid: user.id,
            friendId: selectedFriendId || data.inviterId,
            gameId,
            initialBoard: board,
          });
        });

        socketRef.current.on('inviteDeclined', ({ inviteId }) => {
          setInviteModalVisible(false);
          setSelectedMode(null); // Clear mode on decline
          setError('Invitation declined');
        });

        socketRef.current.on('error', (data) => {
          setError(data.message || 'An error occurred');
          setInviteModalVisible(false);
          setSelectedMode(null); // Clear mode on error
        });
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        setSearchLoading(true);
        handleSearch();
      } else {
        setSearchResults([]);
        setSearchLoading(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const initialize = async () => {
    try {
      setLoading(true);
      setError('');
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser.guest) {
          setUser(parsedUser);
          const friendsResponse = await axios.get(`${API_URL}/api/friends`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFriends(friendsResponse.data.friends || []);
          const requestsResponse = await axios.get(`${API_URL}/api/friend-requests/pending`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setPendingRequests(requestsResponse.data.requests || []);
          const sentRequestsResponse = await axios.get(`${API_URL}/api/friend-requests/sent`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSentPendingRequests(sentRequestsResponse.data.sentRequests || []);
        } else {
          setError('Guest users cannot access friends feature');
        }
      } else {
        setError('Please log in to access friends');
      }
    } catch (err) {
      console.error('Initialization error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  const handleSearchButtonPressIn = () => {
    Animated.spring(searchButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchButtonPressOut = () => {
    Animated.spring(searchButtonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users/search?query=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(response.data.users || []);
      setError('');
      setSuccessMessage('');
    } catch (err) {
      console.error('Search error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/friend-request`,
        { friendId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('Friend request sent successfully');
      setSearchResults(searchResults.filter((u) => u.id !== userId));
      setSentPendingRequests([...sentPendingRequests, { id: userId, username: searchResults.find(u => u.id === userId)?.username || 'Unknown' }]);
      await initialize();
    } catch (err) {
      console.error('Send friend request error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/friend-request/accept`,
        { friendId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingRequests(pendingRequests.filter((req) => req.id !== userId));
      const newFriend = response.data.friend || pendingRequests.find((req) => req.id === userId);
      setFriends([...friends, newFriend]);
      setSuccessMessage('Friend request accepted');
      await initialize();
    } catch (err) {
      console.error('Accept friend request error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (userId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/friend-request/cancel`, // Use /cancel as per auth.js
        { friendId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSentPendingRequests(sentPendingRequests.filter((req) => req.id !== userId));
      setSuccessMessage('Friend request canceled');
      await initialize();
    } catch (err) {
      console.error('Cancel friend request error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to cancel friend request');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (friendId, mode, initialTime) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/game/verify-friend`,
        { friendId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedFriendId(friendId);
      setSelectedMode(mode); // Store the selected mode
      socketRef.current.emit('sendInvite', { inviteeId: friendId, mode, initialTime });
      setInviteModalVisible(true);
    } catch (err) {
      console.error('Send invite error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to send invitation');
      setLoading(false);
    }
  };

  const handleModeSelect = (mode) => {
    let initialTime;
    switch (mode) {
      case 'classic':
        initialTime = 60;
        break;
      case 'blitz':
        initialTime = 30;
        break;
      case 'unlimited':
        initialTime = 999999;
        break;
      case 'rush':
        initialTime = 20;
        break;
      default:
        initialTime = 60;
    }
    setModalVisible(false);
    handlePlay(selectedFriendId, mode, initialTime);
  };

  const handleAcceptInvite = () => {
    if (receivedInvite) {
      socketRef.current.emit('acceptInvite', { inviteId: receivedInvite.inviteId });
      setInviteModalVisible(false);
      setReceivedInvite(null);
    }
  };

  const handleDeclineInvite = () => {
    if (receivedInvite) {
      socketRef.current.emit('declineInvite', { inviteId: receivedInvite.inviteId });
      setInviteModalVisible(false);
      setReceivedInvite(null);
    }
  };

  const handleCancelInvite = () => {
    if (selectedFriendId) {
      socketRef.current.emit('declineInvite', { inviteId: Date.now().toString() }); // Use same inviteId format as backend
      setInviteModalVisible(false);
      setSelectedFriendId(null);
      setSelectedMode(null);
    }
  };

  const handleSpectate = (friendId) => {
    console.log(`Spectating friend ID: ${friendId}`);
    // Add spectate logic here
  };

  const handleRefresh = () => {
    initialize();
  };

  const renderFriendItem = ({ item }) => (
    <View style={styles.friendItem}>
      {item.profile_picture ? (
        <Image source={{ uri: `${API_URL}${item.profile_picture}` }} style={styles.friendProfilePic} />
      ) : (
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.friendPlaceholderPic}>
          <Text style={styles.friendPlaceholderText}>{item.username?.[0]?.toUpperCase() || 'U'}</Text>
        </LinearGradient>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username || 'Unknown'}</Text>
        <Text style={styles.friendId}>ID: {item.id}</Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => { setSelectedFriendId(item.id); setModalVisible(true); }}
        disabled={loading}
      >
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.actionButtonGradient}>
          <Ionicons name="play" size={20} color="#B76E79" />
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleSpectate(item.id)}
        disabled={loading}
      >
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.actionButtonGradient}>
          <Ionicons name="eye" size={20} color="#B76E79" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderSearchItem = ({ item }) => (
    <View style={styles.searchItem}>
      {item.profile_picture ? (
        <Image source={{ uri: `${API_URL}${item.profile_picture}` }} style={styles.friendProfilePic} />
      ) : (
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.friendPlaceholderPic}>
          <Text style={styles.friendPlaceholderText}>{item.username?.[0]?.toUpperCase() || 'U'}</Text>
        </LinearGradient>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username || 'Unknown'}</Text>
        <Text style={styles.friendId}>ID: {item.id}</Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleSendRequest(item.id)}
        disabled={loading}
      >
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.actionButtonGradient}>
          <Ionicons name="person-add" size={20} color="#B76E79" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderPendingRequestItem = ({ item }) => (
    <View style={styles.searchItem}>
      {item.profile_picture ? (
        <Image source={{ uri: `${API_URL}${item.profile_picture}` }} style={styles.friendProfilePic} />
      ) : (
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.friendPlaceholderPic}>
          <Text style={styles.friendPlaceholderText}>{item.username?.[0]?.toUpperCase() || 'U'}</Text>
        </LinearGradient>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username || 'Unknown'}</Text>
        <Text style={styles.friendId}>ID: {item.id}</Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleAcceptRequest(item.id)}
        disabled={loading}
      >
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.actionButtonGradient}>
          <Ionicons name="checkmark" size={20} color="#DC143C" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderSentPendingRequestItem = ({ item }) => (
    <View style={styles.searchItem}>
      {item.profile_picture ? (
        <Image source={{ uri: `${API_URL}${item.profile_picture}` }} style={styles.friendProfilePic} />
      ) : (
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.friendPlaceholderPic}>
          <Text style={styles.friendPlaceholderText}>{item.username?.[0]?.toUpperCase() || 'U'}</Text>
        </LinearGradient>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username || 'Unknown'}</Text>
        <Text style={styles.friendId}>ID: {item.id}</Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleCancelRequest(item.id)}
        disabled={loading}
      >
        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.actionButtonGradient}>
          <Ionicons name="close" size={20} color="#DC143C" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const sections = [
    { title: 'Search Results', data: searchResults, renderItem: renderSearchItem },
    { title: 'Your Friends', data: friends, renderItem: renderFriendItem },
    { title: 'Pending Requests', data: pendingRequests, renderItem: renderPendingRequestItem },
    { title: 'Sent Pending Requests', data: sentPendingRequests, renderItem: renderSentPendingRequestItem },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F0F0F', '#000000']} style={styles.background}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
          <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleRefresh} style={styles.settingsIcon}>
                <Ionicons name="refresh" size={30} color="#EDEDED" />
              </TouchableOpacity>
            </View>

            <View style={styles.middle}>
              <Image
                source={{ uri: 'https://via.placeholder.com/100?text=ChessMate' }}
                style={styles.chessmateImg}
              />
              <Text style={styles.title}>Friends</Text>
              <Text style={styles.subtitle}>Connect with ChessMates</Text>
            </View>

            <View style={styles.formContainerInner}>
              {loading && <ActivityIndicator size="large" color="#B76E79" style={styles.loading} />}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

              {user && !user.guest ? (
                <>
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search users by username or email"
                      placeholderTextColor="#888"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchLoading && <ActivityIndicator size="small" color="#B76E79" style={styles.searchLoading} />}
                    <TouchableOpacity
                      style={styles.searchButton}
                      onPress={handleSearch}
                      onPressIn={handleSearchButtonPressIn}
                      onPressOut={handleSearchButtonPressOut}
                      disabled={loading || searchLoading}
                    >
                      <Animated.View style={[styles.searchButtonInner, { transform: [{ scale: searchButtonScale }] }]}>
                        <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.searchButtonGradient}>
                          <Ionicons name="search" size={20} color="#B76E79" />
                        </LinearGradient>
                      </Animated.View>
                    </TouchableOpacity>
                  </View>

                  <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, section }) => section.renderItem({ item })}
                    renderSectionHeader={({ section: { title } }) => (
                      <Text style={styles.sectionTitle}>{title}</Text>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No data available</Text>
                    }
                    style={styles.list}
                    contentContainerStyle={styles.scrollContent}
                  />
                </>
              ) : (
                <Text style={styles.errorText}>Please log in to access the friends feature</Text>
              )}
            </View>
          </Animated.View>

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Game Mode</Text>
                <TouchableOpacity
                  style={styles.modeButton}
                  onPress={() => handleModeSelect('classic')}
                >
                  <Text style={styles.modeButtonText}>Classic (60 seconds)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modeButton}
                  onPress={() => handleModeSelect('blitz')}
                >
                  <Text style={styles.modeButtonText}>Blitz (30 seconds)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modeButton}
                  onPress={() => handleModeSelect('unlimited')}
                >
                  <Text style={styles.modeButtonText}>Unlimited</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modeButton}
                  onPress={() => handleModeSelect('rush')}
                >
                  <Text style={styles.modeButtonText}>Rush (20 seconds)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            transparent={true}
            visible={inviteModalVisible}
            onRequestClose={() => setInviteModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <LinearGradient colors={['#2A2A2A', '#1C1C1C']} style={styles.modalContent}>
                {receivedInvite ? (
                  <>
                    <Text style={styles.modalTitle}>
                      {receivedInvite.username} invites you to play {receivedInvite.mode}
                    </Text>
                    <TouchableOpacity
                      style={styles.modeButton}
                      onPress={handleAcceptInvite}
                    >
                      <Text style={styles.modeButtonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleDeclineInvite}
                    >
                      <Text style={styles.cancelButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalTitle}>
                      Waiting for {friends.find(f => f.id === selectedFriendId)?.username || 'friend'} to accept your {selectedMode || 'game'} invitation
                    </Text>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelInvite}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
              </LinearGradient>
            </View>
          </Modal>

          <View style={styles.footer}>
            <TouchableOpacity>
              <Image source={{ uri: 'https://via.placeholder.com/48?text=Home' }} style={styles.footerIcon} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Image source={{ uri: 'https://via.placeholder.com/48?text=Friends' }} style={styles.footerIcon} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Image source={{ uri: 'https://via.placeholder.com/48?text=Profile' }} style={styles.footerIcon} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  formContainerInner: {
    flex: 1,
    width: '100%',
    paddingVertical: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 0,
    marginBottom: 15,
  },
  settingsIcon: {
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  middle: {
    alignItems: 'center',
    marginLeft: 10,
    marginBottom: 10,
  },
  chessmateImg: {
    width: '100%',
    height: 40,
    resizeMode: 'contain',
    marginBottom: 2,
  },
  title: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.08, 30),
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: '400',
    marginTop: 5,
    opacity: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    height: Math.min(height * 0.07, 50),
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingHorizontal: width * 0.04,
    color: '#EDEDED',
    fontSize: Math.min(width * 0.045, 16),
    borderWidth: 1,
    borderColor: '#444444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  searchLoading: {
    marginLeft: width * 0.03,
  },
  searchButton: {
    marginLeft: width * 0.03,
  },
  searchButtonInner: {
    borderRadius: 12,
  },
  searchButtonGradient: {
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: '#B76E79',
    fontSize: Math.min(width * 0.05, 20),
    fontWeight: '700',
    marginBottom: 10,
    paddingVertical: 5,
  },
  list: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  friendProfilePic: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    borderWidth: 2,
    borderColor: '#444444',
    marginRight: 10,
  },
  friendPlaceholderPic: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444444',
    marginRight: 10,
  },
  friendPlaceholderText: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.06, 24),
    fontWeight: 'bold',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.045, 16),
    fontWeight: '600',
  },
  friendId: {
    color: '#AAAAAA',
    fontSize: Math.min(width * 0.035, 14),
  },
  actionButton: {
    marginLeft: 10,
  },
  actionButtonGradient: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#DC143C',
    fontSize: Math.min(width * 0.04, 14),
    marginVertical: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  successText: {
    color: '#B76E79',
    fontSize: Math.min(width * 0.04, 14),
    marginVertical: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyText: {
    color: '#888888',
    fontSize: Math.min(width * 0.04, 14),
    textAlign: 'center',
    marginVertical: 10,
  },
  loading: {
    marginVertical: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  footerIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    tintColor: '#EDEDED',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.8,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.05, 20),
    fontWeight: '700',
    marginBottom: 20,
  },
  modeButton: {
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modeButtonText: {
    color: '#EDEDED',
    fontSize: Math.min(width * 0.045, 16),
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#1C1C1C',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#DC143C',
    fontSize: Math.min(width * 0.045, 16),
    fontWeight: '600',
  },
});