// Redux Usage Examples for ChessMate App
// This file contains practical examples of how to use Redux in your components

import { useAppDispatch, useGameData, useUserProfile, useUISettings, useMultiplayerData } from '../hooks/reduxHooks';
import {
  // Game actions
  initializeGame,
  makeMove,
  undoMove,
  resetGame,
  setSelectedSquare,
  togglePlayPause,
  updateTimers,
  setPromotionModalVisible,
  setGameOverModalVisible,
  setExitModalVisible,
  setShowBlackCaptured,
  setShowWhiteCaptured,
  setSelectedColor,
  setShowMoves,
  setBoardFlipped,
  
  // User actions
  loginUser,
  logoutUser,
  updateProfile,
  updatePreferences,
  updateGameStats,
  
  // UI actions
  openModal,
  closeModal,
  setTheme,
  toggleSound,
  toggleMusic,
  addToast,
  removeToast,
  updateSettings,
  updateGameUI,
  
  // Multiplayer actions
  connectToServer,
  createRoom,
  joinRoom,
  leaveRoom,
  sendChatMessage,
  startMatchmaking,
  stopMatchmaking,
} from '../store/slices';

// Example 1: Basic Game Component
export const BasicGameComponent = () => {
  const dispatch = useAppDispatch();
  const gameData = useGameData();

  const handleSquarePress = (square) => {
    if (gameData.selectedSquare) {
      // Make a move
      dispatch(makeMove({ 
        from: gameData.selectedSquare, 
        to: square, 
        promotion: 'q' 
      }));
    } else {
      // Select a square
      dispatch(setSelectedSquare(square));
    }
  };

  const handleUndo = () => {
    dispatch(undoMove());
  };

  const handleReset = () => {
    dispatch(resetGame('classic'));
  };

  return {
    gameData,
    handleSquarePress,
    handleUndo,
    handleReset,
  };
};

// Example 2: User Profile Component
export const UserProfileComponent = () => {
  const dispatch = useAppDispatch();
  const userProfile = useUserProfile();

  const handleLogin = async (credentials) => {
    try {
      await dispatch(loginUser(credentials)).unwrap();
      // Login successful
    } catch (error) {
      // Handle login error
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const handleUpdateProfile = (profileData) => {
    dispatch(updateProfile(profileData));
  };

  const handleUpdatePreferences = (preferences) => {
    dispatch(updatePreferences(preferences));
  };

  return {
    userProfile,
    handleLogin,
    handleLogout,
    handleUpdateProfile,
    handleUpdatePreferences,
  };
};

// Example 3: UI Settings Component
export const UISettingsComponent = () => {
  const dispatch = useAppDispatch();
  const uiSettings = useUISettings();

  const handleThemeChange = (theme) => {
    dispatch(setTheme({ mode: theme }));
  };

  const handleSoundToggle = () => {
    dispatch(toggleSound());
  };

  const handleMusicToggle = () => {
    dispatch(toggleMusic());
  };

  const handleShowToast = (message, type = 'info') => {
    dispatch(addToast({ message, type }));
  };

  const handleOpenModal = (modalName) => {
    dispatch(openModal(modalName));
  };

  const handleCloseModal = (modalName) => {
    dispatch(closeModal(modalName));
  };

  return {
    uiSettings,
    handleThemeChange,
    handleSoundToggle,
    handleMusicToggle,
    handleShowToast,
    handleOpenModal,
    handleCloseModal,
  };
};

// Example 4: Multiplayer Component
export const MultiplayerComponent = () => {
  const dispatch = useAppDispatch();
  const multiplayerData = useMultiplayerData();

  const handleConnect = async (serverUrl) => {
    try {
      await dispatch(connectToServer(serverUrl)).unwrap();
      // Connected successfully
    } catch (error) {
      // Handle connection error
      console.error('Connection failed:', error);
    }
  };

  const handleCreateRoom = async (roomSettings) => {
    try {
      await dispatch(createRoom(roomSettings)).unwrap();
      // Room created successfully
    } catch (error) {
      // Handle room creation error
      console.error('Room creation failed:', error);
    }
  };

  const handleJoinRoom = async (roomId, roomCode) => {
    try {
      await dispatch(joinRoom({ roomId, roomCode })).unwrap();
      // Joined room successfully
    } catch (error) {
      // Handle join error
      console.error('Join room failed:', error);
    }
  };

  const handleSendMessage = (message) => {
    dispatch(sendChatMessage({ message, type: 'text' }));
  };

  const handleStartMatchmaking = (criteria) => {
    dispatch(startMatchmaking(criteria));
  };

  const handleStopMatchmaking = () => {
    dispatch(stopMatchmaking());
  };

  return {
    multiplayerData,
    handleConnect,
    handleCreateRoom,
    handleJoinRoom,
    handleSendMessage,
    handleStartMatchmaking,
    handleStopMatchmaking,
  };
};

// Example 5: Game Timer Component
export const GameTimerComponent = () => {
  const dispatch = useAppDispatch();
  const gameData = useGameData();

  const startTimer = () => {
    // Timer logic would be implemented here
    // This is just an example of how to update timers
    const interval = setInterval(() => {
      if (gameData.currentTurn === 'w') {
        const newWhiteTimer = gameData.whiteTimer - 1;
        if (newWhiteTimer <= 0) {
          clearInterval(interval);
          dispatch(setGameOverModalVisible(true));
        }
        dispatch(updateTimers({ 
          whiteTimer: newWhiteTimer, 
          blackTimer: gameData.blackTimer 
        }));
      } else {
        const newBlackTimer = gameData.blackTimer - 1;
        if (newBlackTimer <= 0) {
          clearInterval(interval);
          dispatch(setGameOverModalVisible(true));
        }
        dispatch(updateTimers({ 
          whiteTimer: gameData.whiteTimer, 
          blackTimer: newBlackTimer 
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  return {
    gameData,
    startTimer,
  };
};

// Example 6: Board Settings Component
export const BoardSettingsComponent = () => {
  const dispatch = useAppDispatch();
  const uiSettings = useUISettings();

  const handleColorChange = (light, dark) => {
    dispatch(setSelectedColor({ light, dark }));
    dispatch(updateGameUI({ 
      boardColors: { light, dark } 
    }));
  };

  const handleOrientationChange = (orientation) => {
    dispatch(setBoardFlipped(orientation === 'black'));
    dispatch(updateGameUI({ 
      boardOrientation: orientation 
    }));
  };

  const handleShowMovesToggle = () => {
    dispatch(setShowMoves(!uiSettings.gameUI.showMoves));
  };

  return {
    uiSettings,
    handleColorChange,
    handleOrientationChange,
    handleShowMovesToggle,
  };
};

// Example 7: Error Handling Component
export const ErrorHandlingComponent = () => {
  const dispatch = useAppDispatch();
  const gameData = useGameData();
  const userProfile = useUserProfile();
  const uiSettings = useUISettings();
  const multiplayerData = useMultiplayerData();

  const handleClearErrors = () => {
    // Clear all errors
    dispatch(clearError('game'));
    dispatch(clearError('user'));
    dispatch(clearError('ui'));
    dispatch(clearError('multiplayer'));
  };

  const handleShowError = (error, type = 'global') => {
    dispatch(addToast({ 
      message: error.message || error, 
      type: 'error' 
    }));
  };

  return {
    errors: {
      game: gameData.error,
      user: userProfile.error,
      ui: uiSettings.errors.global,
      multiplayer: multiplayerData.errors.connection,
    },
    handleClearErrors,
    handleShowError,
  };
};

// Example 8: Loading States Component
export const LoadingStatesComponent = () => {
  const gameData = useGameData();
  const userProfile = useUserProfile();
  const uiSettings = useUISettings();
  const multiplayerData = useMultiplayerData();

  const isLoading = 
    gameData.loading || 
    userProfile.loading || 
    uiSettings.loading.global || 
    Object.values(multiplayerData.loading).some(loading => loading);

  return {
    isLoading,
    loadingStates: {
      game: gameData.loading,
      user: userProfile.loading,
      ui: uiSettings.loading.global,
      multiplayer: multiplayerData.loading,
    },
  };
};

// Example 9: Statistics Component
export const StatisticsComponent = () => {
  const dispatch = useAppDispatch();
  const userProfile = useUserProfile();

  const handleUpdateStats = (gameResult, gameTime, gameMode) => {
    dispatch(updateGameStats({
      result: gameResult, // 'win', 'loss', 'draw'
      gameTime,
      gameMode,
    }));
  };

  return {
    statistics: userProfile.statistics,
    profile: userProfile.profile,
    handleUpdateStats,
  };
};

// Example 10: Complete Game Integration
export const CompleteGameIntegration = () => {
  const dispatch = useAppDispatch();
  const gameData = useGameData();
  const userProfile = useUserProfile();
  const uiSettings = useUISettings();

  // Initialize game when component mounts
  const initializeGameSession = (mode) => {
    dispatch(initializeGame(mode));
  };

  // Handle game move
  const handleGameMove = (from, to, promotion = 'q') => {
    dispatch(makeMove({ from, to, promotion }));
  };

  // Handle game over
  const handleGameOver = (result, gameTime) => {
    dispatch(setGameOverModalVisible(true));
    
    // Update user statistics
    dispatch(updateGameStats({
      result,
      gameTime,
      gameMode: gameData.gameMode,
    }));
  };

  // Handle settings change
  const handleSettingsChange = (settings) => {
    dispatch(updateSettings(settings));
  };

  // Handle theme change
  const handleThemeChange = (theme) => {
    dispatch(setTheme({ mode: theme }));
  };

  return {
    gameData,
    userProfile,
    uiSettings,
    initializeGameSession,
    handleGameMove,
    handleGameOver,
    handleSettingsChange,
    handleThemeChange,
  };
};

// Export all examples for easy importing
export const ReduxExamples = {
  BasicGameComponent,
  UserProfileComponent,
  UISettingsComponent,
  MultiplayerComponent,
  GameTimerComponent,
  BoardSettingsComponent,
  ErrorHandlingComponent,
  LoadingStatesComponent,
  StatisticsComponent,
  CompleteGameIntegration,
};
