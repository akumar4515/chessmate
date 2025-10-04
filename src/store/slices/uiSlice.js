import { createSlice } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  // App state
  isAppInitialized: false,
  showSplash: true,
  isFirstLaunch: true,
  
  // Navigation state
  currentScreen: 'home',
  previousScreen: null,
  navigationHistory: [],
  
  // Modal states
  modals: {
    settings: false,
    profile: false,
    achievements: false,
    statistics: false,
    friends: false,
    gameMode: false,
    exitConfirm: false,
    pause: false,
    promotion: false,
    gameOver: false,
  },
  
  // Sidebar state
  sidebar: {
    isOpen: false,
    activeTab: 'settings',
  },
  
  // Bottom navigation
  bottomNav: {
    visible: true,
    activeTab: 'home',
  },
  
  // Theme and appearance
  theme: {
    mode: 'dark', // dark, light
    primaryColor: '#0F0F0F',
    secondaryColor: '#1A1A1A',
    accentColor: '#FFFFFF',
    textColor: '#FFFFFF',
    subTextColor: '#AAAAAA',
    borderColor: '#333333',
  },
  
  // Sound and haptics
  sound: {
    enabled: true,
    volume: 0.7,
    clickSound: true,
    moveSound: true,
    captureSound: true,
    checkSound: true,
    gameEndSound: true,
    musicEnabled: true,
    musicVolume: 0.5,
  },
  
  // Notifications
  notifications: {
    enabled: true,
    gameInvites: true,
    achievements: true,
    reminders: true,
    sound: true,
    vibration: true,
  },
  
  // Responsive settings
  responsive: {
    screenWidth: 0,
    screenHeight: 0,
    isTablet: false,
    isSmallScreen: false,
    isLargeScreen: false,
    orientation: 'portrait', // portrait, landscape
  },
  
  // Loading states
  loading: {
    global: false,
    game: false,
    user: false,
    multiplayer: false,
    settings: false,
  },
  
  // Error states
  errors: {
    global: null,
    game: null,
    user: null,
    multiplayer: null,
    network: null,
  },
  
  // Toast notifications
  toasts: [],
  
  // App settings
  settings: {
    autoSave: true,
    showLegalMoves: true,
    showCapturedPieces: true,
    showCoordinates: false,
    showMoveHistory: true,
    enableAnimations: true,
    animationSpeed: 'normal', // slow, normal, fast
    enableHaptics: true,
    enableSounds: true,
    enableMusic: true,
    language: 'en',
    timeFormat: '12h', // 12h, 24h
    dateFormat: 'MM/DD/YYYY',
  },
  
  // Game UI settings
  gameUI: {
    boardOrientation: 'white', // white, black
    showMoveHints: true,
    showLastMove: true,
    highlightCheck: true,
    showCoordinates: false,
    pieceStyle: 'classic', // classic, modern, minimal
    boardStyle: 'classic', // classic, modern, wood, marble
    boardColors: {
      light: '#EDEDED',
      dark: '#8B5A5A',
    },
  },
  
  // Keyboard state
  keyboard: {
    isVisible: false,
    height: 0,
  },
  
  // Network state
  network: {
    isConnected: true,
    connectionType: 'wifi', // wifi, cellular, none
    isOnline: true,
  },
  
  // App version and update info
  appInfo: {
    version: '2.0.0',
    buildNumber: '1',
    lastUpdateCheck: null,
    updateAvailable: false,
    updateUrl: null,
  },
};

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // App initialization
    setAppInitialized: (state, action) => {
      state.isAppInitialized = action.payload;
    },
    
    setShowSplash: (state, action) => {
      state.showSplash = action.payload;
    },
    
    setFirstLaunch: (state, action) => {
      state.isFirstLaunch = action.payload;
    },
    
    // Navigation
    setCurrentScreen: (state, action) => {
      state.previousScreen = state.currentScreen;
      state.currentScreen = action.payload;
      state.navigationHistory.push(action.payload);
      
      // Keep only last 10 screens in history
      if (state.navigationHistory.length > 10) {
        state.navigationHistory = state.navigationHistory.slice(-10);
      }
    },
    
    goBack: (state) => {
      if (state.navigationHistory.length > 1) {
        state.navigationHistory.pop();
        state.previousScreen = state.currentScreen;
        state.currentScreen = state.navigationHistory[state.navigationHistory.length - 1];
      }
    },
    
    // Modal management
    openModal: (state, action) => {
      state.modals[action.payload] = true;
    },
    
    closeModal: (state, action) => {
      state.modals[action.payload] = false;
    },
    
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key] = false;
      });
    },
    
    // Sidebar management
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },
    
    setSidebarOpen: (state, action) => {
      state.sidebar.isOpen = action.payload;
    },
    
    setSidebarActiveTab: (state, action) => {
      state.sidebar.activeTab = action.payload;
    },
    
    // Bottom navigation
    setBottomNavVisible: (state, action) => {
      state.bottomNav.visible = action.payload;
    },
    
    setBottomNavActiveTab: (state, action) => {
      state.bottomNav.activeTab = action.payload;
    },
    
    // Theme management
    setTheme: (state, action) => {
      state.theme = { ...state.theme, ...action.payload };
    },
    
    toggleTheme: (state) => {
      state.theme.mode = state.theme.mode === 'dark' ? 'light' : 'dark';
    },
    
    // Sound management
    setSoundSettings: (state, action) => {
      state.sound = { ...state.sound, ...action.payload };
    },
    
    toggleSound: (state) => {
      state.sound.enabled = !state.sound.enabled;
    },
    
    toggleMusic: (state) => {
      state.sound.musicEnabled = !state.sound.musicEnabled;
    },
    
    // Notifications
    setNotificationSettings: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    
    toggleNotifications: (state) => {
      state.notifications.enabled = !state.notifications.enabled;
    },
    
    // Responsive settings
    updateScreenDimensions: (state, action) => {
      const { width, height, orientation } = action.payload;
      state.responsive.screenWidth = width;
      state.responsive.screenHeight = height;
      state.responsive.orientation = orientation;
      state.responsive.isTablet = width > 768;
      state.responsive.isSmallScreen = height < 700;
      state.responsive.isLargeScreen = height > 800;
    },
    
    // Loading states
    setLoading: (state, action) => {
      const { type, loading } = action.payload;
      state.loading[type] = loading;
    },
    
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    
    // Error management
    setError: (state, action) => {
      const { type, error } = action.payload;
      state.errors[type] = error;
    },
    
    clearError: (state, action) => {
      const type = action.payload || 'global';
      state.errors[type] = null;
    },
    
    clearAllErrors: (state) => {
      Object.keys(state.errors).forEach(key => {
        state.errors[key] = null;
      });
    },
    
    // Toast notifications
    addToast: (state, action) => {
      const toast = {
        id: Date.now().toString(),
        message: action.payload.message,
        type: action.payload.type || 'info', // success, error, warning, info
        duration: action.payload.duration || 3000,
        timestamp: Date.now(),
      };
      state.toasts.push(toast);
    },
    
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    
    clearToasts: (state) => {
      state.toasts = [];
    },
    
    // App settings
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // Game UI settings
    updateGameUI: (state, action) => {
      state.gameUI = { ...state.gameUI, ...action.payload };
    },
    
    setBoardOrientation: (state, action) => {
      state.gameUI.boardOrientation = action.payload;
    },
    
    setBoardColors: (state, action) => {
      state.gameUI.boardColors = { ...state.gameUI.boardColors, ...action.payload };
    },
    
    // Keyboard state
    setKeyboardVisible: (state, action) => {
      state.keyboard.isVisible = action.payload.visible;
      state.keyboard.height = action.payload.height || 0;
    },
    
    // Network state
    setNetworkState: (state, action) => {
      state.network = { ...state.network, ...action.payload };
    },
    
    // App info
    updateAppInfo: (state, action) => {
      state.appInfo = { ...state.appInfo, ...action.payload };
    },
    
    // Reset UI state
    resetUI: (state) => {
      return { ...initialState, theme: state.theme, sound: state.sound };
    },
  },
});

export const {
  setAppInitialized,
  setShowSplash,
  setFirstLaunch,
  setCurrentScreen,
  goBack,
  openModal,
  closeModal,
  closeAllModals,
  toggleSidebar,
  setSidebarOpen,
  setSidebarActiveTab,
  setBottomNavVisible,
  setBottomNavActiveTab,
  setTheme,
  toggleTheme,
  setSoundSettings,
  toggleSound,
  toggleMusic,
  setNotificationSettings,
  toggleNotifications,
  updateScreenDimensions,
  setLoading,
  setGlobalLoading,
  setError,
  clearError,
  clearAllErrors,
  addToast,
  removeToast,
  clearToasts,
  updateSettings,
  updateGameUI,
  setBoardOrientation,
  setBoardColors,
  setKeyboardVisible,
  setNetworkState,
  updateAppInfo,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;
