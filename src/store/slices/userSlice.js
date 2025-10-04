import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initial state
const initialState = {
  // User authentication
  isAuthenticated: false,
  user: null,
  token: null,
  
  // User profile
  profile: {
    id: null,
    username: '',
    email: '',
    avatar: null,
    rating: 1200,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDrawn: 0,
    winRate: 0,
    bestRating: 1200,
    currentStreak: 0,
    longestStreak: 0,
    favoriteOpening: '',
    timeSpent: 0,
    level: 1,
    achievements: [],
  },
  
  // User preferences
  preferences: {
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true,
    notificationsEnabled: true,
    theme: 'dark', // dark, light
    language: 'en',
    autoSave: true,
    showLegalMoves: true,
    showCapturedPieces: true,
    boardColor: { light: '#EDEDED', dark: '#8B5A5A' },
    pieceStyle: 'classic',
    animationSpeed: 'normal',
  },
  
  // User statistics
  statistics: {
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    averageGameTime: 0,
    totalTimePlayed: 0,
    bestWinStreak: 0,
    currentWinStreak: 0,
    favoriteGameMode: 'classic',
    mostUsedOpening: '',
    accuracy: 0,
    blunders: 0,
    mistakes: 0,
    inaccuracies: 0,
  },
  
  // Loading states
  loading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'user/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Simulate API call - replace with actual authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('userToken', data.token);
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'user/registerUser',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      // Simulate API call - replace with actual registration
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      
      const data = await response.json();
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('userToken', data.token);
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'user/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      // Remove token from AsyncStorage
      await AsyncStorage.removeItem('userToken');
      
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadUserProfile = createAsyncThunk(
  'user/loadUserProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.user.token;
      
      if (!token) {
        throw new Error('No authentication token');
      }
      
      // Simulate API call - replace with actual profile loading
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateUserProfile',
  async (profileData, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.user.token;
      
      if (!token) {
        throw new Error('No authentication token');
      }
      
      // Simulate API call - replace with actual profile update
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserPreferences = createAsyncThunk(
  'user/updateUserPreferences',
  async (preferences, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.user.token;
      
      if (!token) {
        throw new Error('No authentication token');
      }
      
      // Simulate API call - replace with actual preferences update
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadUserStatistics = createAsyncThunk(
  'user/loadUserStatistics',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.user.token;
      
      if (!token) {
        throw new Error('No authentication token');
      }
      
      // Simulate API call - replace with actual statistics loading
      const response = await fetch('/api/user/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load statistics');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'user/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        return { isAuthenticated: false, user: null, token: null };
      }
      
      // Simulate token validation - replace with actual validation
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        await AsyncStorage.removeItem('userToken');
        return { isAuthenticated: false, user: null, token: null };
      }
      
      const data = await response.json();
      return {
        isAuthenticated: true,
        user: data.user,
        token: token,
      };
    } catch (error) {
      await AsyncStorage.removeItem('userToken');
      return rejectWithValue(error.message);
    }
  }
);

// User slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Update user profile locally
    updateProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    
    // Update user preferences locally
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    
    // Update user statistics locally
    updateStatistics: (state, action) => {
      state.statistics = { ...state.statistics, ...action.payload };
    },
    
    // Set user rating
    setUserRating: (state, action) => {
      state.profile.rating = action.payload;
      if (action.payload > state.profile.bestRating) {
        state.profile.bestRating = action.payload;
      }
    },
    
    // Update game statistics after game
    updateGameStats: (state, action) => {
      const { result, gameTime, gameMode } = action.payload;
      
      state.statistics.totalGames += 1;
      state.profile.gamesPlayed += 1;
      
      if (result === 'win') {
        state.statistics.wins += 1;
        state.profile.gamesWon += 1;
        state.statistics.currentWinStreak += 1;
        state.profile.currentStreak += 1;
        
        if (state.statistics.currentWinStreak > state.statistics.bestWinStreak) {
          state.statistics.bestWinStreak = state.statistics.currentWinStreak;
        }
        if (state.profile.currentStreak > state.profile.longestStreak) {
          state.profile.longestStreak = state.profile.currentStreak;
        }
      } else if (result === 'loss') {
        state.statistics.losses += 1;
        state.profile.gamesLost += 1;
        state.statistics.currentWinStreak = 0;
        state.profile.currentStreak = 0;
      } else if (result === 'draw') {
        state.statistics.draws += 1;
        state.profile.gamesDrawn += 1;
        state.statistics.currentWinStreak = 0;
        state.profile.currentStreak = 0;
      }
      
      // Update win rate
      state.statistics.winRate = state.statistics.totalGames > 0 
        ? (state.statistics.wins / state.statistics.totalGames) * 100 
        : 0;
      state.profile.winRate = state.profile.gamesPlayed > 0 
        ? (state.profile.gamesWon / state.profile.gamesPlayed) * 100 
        : 0;
      
      // Update time spent
      state.statistics.totalTimePlayed += gameTime;
      state.profile.timeSpent += gameTime;
      state.statistics.averageGameTime = state.statistics.totalTimePlayed / state.statistics.totalGames;
      
      // Update level based on rating
      const newLevel = Math.floor(state.profile.rating / 200) + 1;
      state.profile.level = newLevel;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login user
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Register user
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Logout user
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Load user profile
      .addCase(loadUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = { ...state.profile, ...action.payload };
      })
      .addCase(loadUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = { ...state.profile, ...action.payload };
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update user preferences
      .addCase(updateUserPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = { ...state.preferences, ...action.payload };
      })
      .addCase(updateUserPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Load user statistics
      .addCase(loadUserStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUserStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = { ...state.statistics, ...action.payload };
      })
      .addCase(loadUserStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const {
  updateProfile,
  updatePreferences,
  updateStatistics,
  setUserRating,
  updateGameStats,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;
