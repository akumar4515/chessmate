import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Chess } from 'chess.js';

// Initial state
const initialState = {
  // Connection state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  socket: null,
  
  // Room state
  currentRoom: null,
  roomId: null,
  roomCode: null,
  roomSettings: {
    timeControl: 'classic', // classic, blitz, bullet, unlimited
    timeLimit: 60, // seconds
    increment: 0, // seconds added per move
    rated: false,
    private: false,
    allowSpectators: true,
  },
  
  // Players
  players: {
    white: null,
    black: null,
    spectators: [],
  },
  
  // Game state
  gameState: {
    fen: '',
    currentTurn: 'w',
    moveHistory: [],
    capturedPieces: { white: [], black: [] },
    isGameOver: false,
    gameOverReason: null,
    winner: null,
  },
  
  // Player state
  playerState: {
    color: null, // 'w' or 'b' or null for spectator
    isMyTurn: false,
    timeRemaining: 0,
    rating: 0,
    isReady: false,
  },
  
  // Opponent state
  opponentState: {
    id: null,
    username: '',
    rating: 0,
    timeRemaining: 0,
    isReady: false,
    isOnline: true,
    lastSeen: null,
  },
  
  // Chat
  chat: {
    messages: [],
    isEnabled: true,
    isMuted: false,
  },
  
  // Game invitations
  invitations: {
    received: [],
    sent: [],
  },
  
  // Available rooms
  availableRooms: [],
  
  // Friends
  friends: {
    list: [],
    online: [],
    requests: {
      received: [],
      sent: [],
    },
  },
  
  // Matchmaking
  matchmaking: {
    isSearching: false,
    searchCriteria: {
      timeControl: 'classic',
      ratingRange: { min: 0, max: 3000 },
      allowRated: true,
    },
    estimatedWaitTime: 0,
  },
  
  // Statistics
  statistics: {
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0,
    averageGameTime: 0,
    rating: 1200,
    peakRating: 1200,
  },
  
  // Loading states
  loading: {
    connecting: false,
    joiningRoom: false,
    leavingRoom: false,
    searching: false,
    sendingMove: false,
  },
  
  // Error states
  errors: {
    connection: null,
    room: null,
    game: null,
    chat: null,
  },
  
  // UI state
  ui: {
    showChat: false,
    showSpectators: false,
    showGameInfo: false,
    showInviteModal: false,
    showFriendsModal: false,
    showSettingsModal: false,
  },
};

// Async thunks
export const connectToServer = createAsyncThunk(
  'multiplayer/connectToServer',
  async (serverUrl, { rejectWithValue }) => {
    try {
      // Simulate socket connection - replace with actual socket.io connection
      const socket = {
        id: 'mock-socket-id',
        connected: true,
        emit: () => {},
        on: () => {},
        off: () => {},
        disconnect: () => {},
      };
      
      return { socket, serverUrl };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const disconnectFromServer = createAsyncThunk(
  'multiplayer/disconnectFromServer',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const socket = state.multiplayer.socket;
      
      if (socket) {
        socket.disconnect();
      }
      
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createRoom = createAsyncThunk(
  'multiplayer/createRoom',
  async (roomSettings, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const socket = state.multiplayer.socket;
      
      if (!socket) {
        throw new Error('Not connected to server');
      }
      
      // Simulate room creation - replace with actual socket emission
      const room = {
        id: 'room-' + Date.now(),
        code: Math.random().toString(36).substr(2, 6).toUpperCase(),
        settings: roomSettings,
        players: { white: null, black: null, spectators: [] },
        gameState: {
          fen: new Chess().fen(),
          currentTurn: 'w',
          moveHistory: [],
          capturedPieces: { white: [], black: [] },
          isGameOver: false,
        },
        createdAt: Date.now(),
      };
      
      return room;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const joinRoom = createAsyncThunk(
  'multiplayer/joinRoom',
  async ({ roomId, roomCode }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const socket = state.multiplayer.socket;
      
      if (!socket) {
        throw new Error('Not connected to server');
      }
      
      // Simulate room joining - replace with actual socket emission
      const room = {
        id: roomId,
        code: roomCode,
        settings: {
          timeControl: 'classic',
          timeLimit: 60,
          increment: 0,
          rated: false,
          private: false,
          allowSpectators: true,
        },
        players: {
          white: { id: 'player1', username: 'Player1', rating: 1200 },
          black: null,
          spectators: [],
        },
        gameState: {
          fen: new Chess().fen(),
          currentTurn: 'w',
          moveHistory: [],
          capturedPieces: { white: [], black: [] },
          isGameOver: false,
        },
      };
      
      return room;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const leaveRoom = createAsyncThunk(
  'multiplayer/leaveRoom',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const socket = state.multiplayer.socket;
      
      if (!socket) {
        throw new Error('Not connected to server');
      }
      
      // Simulate leaving room - replace with actual socket emission
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const makeMove = createAsyncThunk(
  'multiplayer/makeMove',
  async ({ from, to, promotion = 'q' }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const socket = state.multiplayer.socket;
      
      if (!socket) {
        throw new Error('Not connected to server');
      }
      
      // Simulate move - replace with actual socket emission
      const move = {
        from,
        to,
        promotion,
        timestamp: Date.now(),
        playerId: state.user.user?.id,
      };
      
      return move;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'multiplayer/sendChatMessage',
  async ({ message, type = 'text' }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const socket = state.multiplayer.socket;
      
      if (!socket) {
        throw new Error('Not connected to server');
      }
      
      // Simulate chat message - replace with actual socket emission
      const chatMessage = {
        id: Date.now().toString(),
        message,
        type,
        senderId: state.user.user?.id,
        senderName: state.user.user?.username || 'Anonymous',
        timestamp: Date.now(),
      };
      
      return chatMessage;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const startMatchmaking = createAsyncThunk(
  'multiplayer/startMatchmaking',
  async (criteria, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const socket = state.multiplayer.socket;
      
      if (!socket) {
        throw new Error('Not connected to server');
      }
      
      // Simulate matchmaking start - replace with actual socket emission
      return criteria;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const stopMatchmaking = createAsyncThunk(
  'multiplayer/stopMatchmaking',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const socket = state.multiplayer.socket;
      
      if (!socket) {
        throw new Error('Not connected to server');
      }
      
      // Simulate matchmaking stop - replace with actual socket emission
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadFriends = createAsyncThunk(
  'multiplayer/loadFriends',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.user.token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // Simulate friends loading - replace with actual API call
      const friends = {
        list: [],
        online: [],
        requests: {
          received: [],
          sent: [],
        },
      };
      
      return friends;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Multiplayer slice
const multiplayerSlice = createSlice({
  name: 'multiplayer',
  initialState,
  reducers: {
    // Connection management
    setConnectionState: (state, action) => {
      state.isConnected = action.payload.connected;
      state.isConnecting = action.payload.connecting;
      state.connectionError = action.payload.error;
    },
    
    // Room management
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
      if (action.payload) {
        state.roomId = action.payload.id;
        state.roomCode = action.payload.code;
        state.roomSettings = action.payload.settings;
        state.players = action.payload.players;
        state.gameState = action.payload.gameState;
      } else {
        state.roomId = null;
        state.roomCode = null;
        state.roomSettings = initialState.roomSettings;
        state.players = initialState.players;
        state.gameState = initialState.gameState;
      }
    },
    
    // Player management
    setPlayerColor: (state, action) => {
      state.playerState.color = action.payload;
    },
    
    setPlayerReady: (state, action) => {
      state.playerState.isReady = action.payload;
    },
    
    setOpponentInfo: (state, action) => {
      state.opponentState = { ...state.opponentState, ...action.payload };
    },
    
    // Game state management
    updateGameState: (state, action) => {
      state.gameState = { ...state.gameState, ...action.payload };
    },
    
    setGameOver: (state, action) => {
      state.gameState.isGameOver = true;
      state.gameState.gameOverReason = action.payload.reason;
      state.gameState.winner = action.payload.winner;
    },
    
    // Timer management
    updateTimers: (state, action) => {
      const { white, black } = action.payload;
      if (state.playerState.color === 'w') {
        state.playerState.timeRemaining = white;
        state.opponentState.timeRemaining = black;
      } else {
        state.playerState.timeRemaining = black;
        state.opponentState.timeRemaining = white;
      }
    },
    
    // Chat management
    addChatMessage: (state, action) => {
      state.chat.messages.push(action.payload);
      
      // Keep only last 100 messages
      if (state.chat.messages.length > 100) {
        state.chat.messages = state.chat.messages.slice(-100);
      }
    },
    
    clearChat: (state) => {
      state.chat.messages = [];
    },
    
    setChatEnabled: (state, action) => {
      state.chat.isEnabled = action.payload;
    },
    
    setChatMuted: (state, action) => {
      state.chat.isMuted = action.payload;
    },
    
    // Invitations management
    addInvitation: (state, action) => {
      const { type, invitation } = action.payload;
      state.invitations[type].push(invitation);
    },
    
    removeInvitation: (state, action) => {
      const { type, invitationId } = action.payload;
      state.invitations[type] = state.invitations[type].filter(
        inv => inv.id !== invitationId
      );
    },
    
    clearInvitations: (state, action) => {
      const type = action.payload || 'received';
      state.invitations[type] = [];
    },
    
    // Available rooms
    setAvailableRooms: (state, action) => {
      state.availableRooms = action.payload;
    },
    
    // Friends management
    addFriend: (state, action) => {
      state.friends.list.push(action.payload);
    },
    
    removeFriend: (state, action) => {
      state.friends.list = state.friends.list.filter(
        friend => friend.id !== action.payload
      );
    },
    
    setFriendsOnline: (state, action) => {
      state.friends.online = action.payload;
    },
    
    // Matchmaking
    setMatchmakingSearching: (state, action) => {
      state.matchmaking.isSearching = action.payload;
    },
    
    setMatchmakingCriteria: (state, action) => {
      state.matchmaking.searchCriteria = { ...state.matchmaking.searchCriteria, ...action.payload };
    },
    
    setEstimatedWaitTime: (state, action) => {
      state.matchmaking.estimatedWaitTime = action.payload;
    },
    
    // Statistics
    updateStatistics: (state, action) => {
      state.statistics = { ...state.statistics, ...action.payload };
    },
    
    // Loading states
    setLoading: (state, action) => {
      const { type, loading } = action.payload;
      state.loading[type] = loading;
    },
    
    // Error management
    setError: (state, action) => {
      const { type, error } = action.payload;
      state.errors[type] = error;
    },
    
    clearError: (state, action) => {
      const type = action.payload || 'connection';
      state.errors[type] = null;
    },
    
    // UI state
    setUIState: (state, action) => {
      state.ui = { ...state.ui, ...action.payload };
    },
    
    toggleChat: (state) => {
      state.ui.showChat = !state.ui.showChat;
    },
    
    toggleSpectators: (state) => {
      state.ui.showSpectators = !state.ui.showSpectators;
    },
    
    // Reset multiplayer state
    resetMultiplayer: (state) => {
      return { ...initialState, socket: state.socket };
    },
  },
  extraReducers: (builder) => {
    builder
      // Connect to server
      .addCase(connectToServer.pending, (state) => {
        state.loading.connecting = true;
        state.isConnecting = true;
        state.connectionError = null;
      })
      .addCase(connectToServer.fulfilled, (state, action) => {
        state.loading.connecting = false;
        state.isConnecting = false;
        state.isConnected = true;
        state.socket = action.payload.socket;
      })
      .addCase(connectToServer.rejected, (state, action) => {
        state.loading.connecting = false;
        state.isConnecting = false;
        state.isConnected = false;
        state.connectionError = action.payload;
      })
      
      // Disconnect from server
      .addCase(disconnectFromServer.pending, (state) => {
        state.loading.connecting = true;
      })
      .addCase(disconnectFromServer.fulfilled, (state) => {
        state.loading.connecting = false;
        state.isConnected = false;
        state.socket = null;
        state.currentRoom = null;
        state.roomId = null;
        state.roomCode = null;
      })
      .addCase(disconnectFromServer.rejected, (state, action) => {
        state.loading.connecting = false;
        state.errors.connection = action.payload;
      })
      
      // Create room
      .addCase(createRoom.pending, (state) => {
        state.loading.joiningRoom = true;
        state.errors.room = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading.joiningRoom = false;
        state.currentRoom = action.payload;
        state.roomId = action.payload.id;
        state.roomCode = action.payload.code;
        state.roomSettings = action.payload.settings;
        state.players = action.payload.players;
        state.gameState = action.payload.gameState;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading.joiningRoom = false;
        state.errors.room = action.payload;
      })
      
      // Join room
      .addCase(joinRoom.pending, (state) => {
        state.loading.joiningRoom = true;
        state.errors.room = null;
      })
      .addCase(joinRoom.fulfilled, (state, action) => {
        state.loading.joiningRoom = false;
        state.currentRoom = action.payload;
        state.roomId = action.payload.id;
        state.roomCode = action.payload.code;
        state.roomSettings = action.payload.settings;
        state.players = action.payload.players;
        state.gameState = action.payload.gameState;
      })
      .addCase(joinRoom.rejected, (state, action) => {
        state.loading.joiningRoom = false;
        state.errors.room = action.payload;
      })
      
      // Leave room
      .addCase(leaveRoom.pending, (state) => {
        state.loading.leavingRoom = true;
      })
      .addCase(leaveRoom.fulfilled, (state) => {
        state.loading.leavingRoom = false;
        state.currentRoom = null;
        state.roomId = null;
        state.roomCode = null;
        state.players = initialState.players;
        state.gameState = initialState.gameState;
        state.playerState = initialState.playerState;
        state.opponentState = initialState.opponentState;
      })
      .addCase(leaveRoom.rejected, (state, action) => {
        state.loading.leavingRoom = false;
        state.errors.room = action.payload;
      })
      
      // Make move
      .addCase(makeMove.pending, (state) => {
        state.loading.sendingMove = true;
        state.errors.game = null;
      })
      .addCase(makeMove.fulfilled, (state, action) => {
        state.loading.sendingMove = false;
        // Move will be handled by socket events
      })
      .addCase(makeMove.rejected, (state, action) => {
        state.loading.sendingMove = false;
        state.errors.game = action.payload;
      })
      
      // Send chat message
      .addCase(sendChatMessage.pending, (state) => {
        state.errors.chat = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chat.messages.push(action.payload);
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.errors.chat = action.payload;
      })
      
      // Start matchmaking
      .addCase(startMatchmaking.pending, (state) => {
        state.loading.searching = true;
        state.matchmaking.isSearching = true;
      })
      .addCase(startMatchmaking.fulfilled, (state, action) => {
        state.loading.searching = false;
        state.matchmaking.searchCriteria = action.payload;
      })
      .addCase(startMatchmaking.rejected, (state, action) => {
        state.loading.searching = false;
        state.matchmaking.isSearching = false;
        state.errors.connection = action.payload;
      })
      
      // Stop matchmaking
      .addCase(stopMatchmaking.pending, (state) => {
        state.loading.searching = true;
      })
      .addCase(stopMatchmaking.fulfilled, (state) => {
        state.loading.searching = false;
        state.matchmaking.isSearching = false;
      })
      .addCase(stopMatchmaking.rejected, (state, action) => {
        state.loading.searching = false;
        state.errors.connection = action.payload;
      })
      
      // Load friends
      .addCase(loadFriends.pending, (state) => {
        state.loading.connecting = true;
      })
      .addCase(loadFriends.fulfilled, (state, action) => {
        state.loading.connecting = false;
        state.friends = action.payload;
      })
      .addCase(loadFriends.rejected, (state, action) => {
        state.loading.connecting = false;
        state.errors.connection = action.payload;
      });
  },
});

export const {
  setConnectionState,
  setCurrentRoom,
  setPlayerColor,
  setPlayerReady,
  setOpponentInfo,
  updateGameState,
  setGameOver,
  updateTimers,
  addChatMessage,
  clearChat,
  setChatEnabled,
  setChatMuted,
  addInvitation,
  removeInvitation,
  clearInvitations,
  setAvailableRooms,
  addFriend,
  removeFriend,
  setFriendsOnline,
  setMatchmakingSearching,
  setMatchmakingCriteria,
  setEstimatedWaitTime,
  updateStatistics,
  setLoading,
  setError,
  clearError,
  setUIState,
  toggleChat,
  toggleSpectators,
  resetMultiplayer,
} = multiplayerSlice.actions;

export default multiplayerSlice.reducer;
