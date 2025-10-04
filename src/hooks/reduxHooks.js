import { useDispatch, useSelector } from 'react-redux';

// Typed hooks for better TypeScript support
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Custom hooks for specific slices
export const useGameState = () => {
  return useAppSelector((state) => state.game);
};

export const useUserState = () => {
  return useAppSelector((state) => state.user);
};

export const useUIState = () => {
  return useAppSelector((state) => state.ui);
};

export const useMultiplayerState = () => {
  return useAppSelector((state) => state.multiplayer);
};

// Specific selectors for commonly used data
export const useGameData = () => {
  return useAppSelector((state) => ({
    gameFEN: state.game.gameFEN,
    currentTurn: state.game.currentTurn,
    selectedSquare: state.game.selectedSquare,
    validMoves: state.game.validMoves,
    isGameOver: state.game.isGameOver,
    gameOverMessage: state.game.gameOverMessage,
    capturedPieces: state.game.capturedPieces,
    moveHistory: state.game.moveHistory,
    whiteTimer: state.game.whiteTimer,
    blackTimer: state.game.blackTimer,
    isPlay: state.game.isPlay,
  }));
};

export const useUserProfile = () => {
  return useAppSelector((state) => ({
    isAuthenticated: state.user.isAuthenticated,
    user: state.user.user,
    profile: state.user.profile,
    preferences: state.user.preferences,
    statistics: state.user.statistics,
  }));
};

export const useUISettings = () => {
  return useAppSelector((state) => ({
    theme: state.ui.theme,
    sound: state.ui.sound,
    notifications: state.ui.notifications,
    settings: state.ui.settings,
    gameUI: state.ui.gameUI,
  }));
};

export const useMultiplayerData = () => {
  return useAppSelector((state) => ({
    isConnected: state.multiplayer.isConnected,
    currentRoom: state.multiplayer.currentRoom,
    players: state.multiplayer.players,
    gameState: state.multiplayer.gameState,
    playerState: state.multiplayer.playerState,
    opponentState: state.multiplayer.opponentState,
    chat: state.multiplayer.chat,
    matchmaking: state.multiplayer.matchmaking,
  }));
};

// Loading states
export const useLoadingStates = () => {
  return useAppSelector((state) => ({
    game: state.game.loading,
    user: state.user.loading,
    ui: state.ui.loading.global,
    multiplayer: state.multiplayer.loading,
  }));
};

// Error states
export const useErrorStates = () => {
  return useAppSelector((state) => ({
    game: state.game.error,
    user: state.user.error,
    ui: state.ui.errors.global,
    multiplayer: state.multiplayer.errors.connection,
  }));
};
