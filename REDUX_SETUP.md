# Redux Setup for ChessMate App

This document explains the Redux state management implementation for your ChessMate app.

## 🚀 What's Been Implemented

### 1. Redux Store Configuration
- **Location**: `src/store/index.js`
- **Features**:
  - Redux Toolkit for modern Redux development
  - Redux Persist for state persistence
  - AsyncStorage for React Native persistence
  - Proper middleware configuration
  - TypeScript support ready

### 2. Redux Slices

#### Game Slice (`src/store/slices/gameSlice.js`)
Manages all chess game-related state:
- **State**: Game FEN, current turn, selected square, valid moves, timers, captured pieces, move history
- **Actions**: `initializeGame`, `makeMove`, `undoMove`, `resetGame`, `setSelectedSquare`, etc.
- **Async Thunks**: Handle complex game operations with proper error handling

#### User Slice (`src/store/slices/userSlice.js`)
Manages user authentication and profile:
- **State**: Authentication status, user profile, preferences, statistics
- **Actions**: `loginUser`, `registerUser`, `logoutUser`, `updateProfile`, etc.
- **Features**: User statistics tracking, game history, achievements

#### UI Slice (`src/store/slices/uiSlice.js`)
Manages app UI state:
- **State**: Modals, sidebar, theme, sound settings, notifications, responsive settings
- **Actions**: `openModal`, `closeModal`, `setTheme`, `toggleSound`, etc.
- **Features**: Toast notifications, loading states, error management

#### Multiplayer Slice (`src/store/slices/multiplayerSlice.js`)
Manages online multiplayer state:
- **State**: Connection status, room management, player info, chat, matchmaking
- **Actions**: `connectToServer`, `createRoom`, `joinRoom`, `makeMove`, etc.
- **Features**: Real-time game state, chat system, friend management

### 3. Redux Hooks (`src/hooks/reduxHooks.js`)
Custom hooks for easy state access:
- `useAppDispatch()` - Typed dispatch hook
- `useAppSelector()` - Typed selector hook
- `useGameData()` - Game state selector
- `useUserProfile()` - User profile selector
- `useUISettings()` - UI settings selector
- `useMultiplayerData()` - Multiplayer state selector

### 4. Redux Provider (`src/components/ReduxProvider.js`)
Wrapper component that provides Redux store to the app:
- PersistGate for state rehydration
- Proper loading states
- Integrated with your existing providers

## 📁 File Structure

```
src/
├── store/
│   ├── index.js                 # Store configuration
│   └── slices/
│       ├── gameSlice.js         # Chess game state
│       ├── userSlice.js         # User authentication & profile
│       ├── uiSlice.js           # UI state management
│       └── multiplayerSlice.js  # Online multiplayer state
├── hooks/
│   └── reduxHooks.js            # Custom Redux hooks
└── components/
    └── ReduxProvider.js         # Redux provider wrapper
```

## 🔧 How to Use Redux in Your Components

### Basic Usage

```javascript
import React from 'react';
import { useAppDispatch, useGameData } from '../src/hooks/reduxHooks';
import { makeMove, setSelectedSquare } from '../src/store/slices/gameSlice';

function ChessComponent() {
  const dispatch = useAppDispatch();
  const gameData = useGameData();

  const handleSquarePress = (square) => {
    if (gameData.selectedSquare) {
      dispatch(makeMove({ 
        from: gameData.selectedSquare, 
        to: square, 
        promotion: 'q' 
      }));
    } else {
      dispatch(setSelectedSquare(square));
    }
  };

  return (
    <View>
      <Text>Current Turn: {gameData.currentTurn}</Text>
      <Text>Game FEN: {gameData.gameFEN}</Text>
      {/* Your chess board UI */}
    </View>
  );
}
```

### Using Async Actions

```javascript
import { initializeGame, resetGame } from '../src/store/slices/gameSlice';

function GameSetup() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initialize game with specific mode
    dispatch(initializeGame('blitz'));
  }, [dispatch]);

  const handleReset = () => {
    dispatch(resetGame('classic'));
  };

  return (
    <View>
      <Button title="Reset Game" onPress={handleReset} />
    </View>
  );
}
```

### Using UI State

```javascript
import { useUISettings } from '../src/hooks/reduxHooks';
import { openModal, closeModal, setTheme } from '../src/store/slices/uiSlice';

function SettingsComponent() {
  const dispatch = useAppDispatch();
  const uiSettings = useUISettings();

  const handleOpenSettings = () => {
    dispatch(openModal('settings'));
  };

  const handleThemeChange = (theme) => {
    dispatch(setTheme({ mode: theme }));
  };

  return (
    <View>
      <Button title="Open Settings" onPress={handleOpenSettings} />
      <Text>Current Theme: {uiSettings.theme.mode}</Text>
    </View>
  );
}
```

## 🎮 Example: Redux-Powered Chess Component

I've created `app/chessRedux.jsx` as an example of how to use Redux with your chess game. This component demonstrates:

1. **State Management**: All game state is managed through Redux
2. **Actions**: Game moves, timer updates, UI interactions
3. **Async Operations**: Game initialization, move validation
4. **Error Handling**: Proper error states and loading indicators
5. **Persistence**: Game state persists across app restarts

### Key Features of the Redux Version:

- **Centralized State**: All game logic is in Redux slices
- **Predictable Updates**: State changes through actions only
- **Time Travel Debugging**: Redux DevTools support
- **Persistence**: Game settings persist across sessions
- **Error Handling**: Comprehensive error management
- **Loading States**: Proper loading indicators

## 🔄 Migration Guide

### From Local State to Redux

1. **Identify State**: Find components with local state that should be global
2. **Create Actions**: Define actions in appropriate slices
3. **Update Components**: Replace `useState` with Redux hooks
4. **Test**: Ensure state updates work correctly

### Example Migration:

**Before (Local State):**
```javascript
const [gameFEN, setGameFEN] = useState('');
const [currentTurn, setCurrentTurn] = useState('w');

const handleMove = (move) => {
  setGameFEN(newFEN);
  setCurrentTurn(newTurn);
};
```

**After (Redux):**
```javascript
const gameData = useGameData();
const dispatch = useAppDispatch();

const handleMove = (move) => {
  dispatch(makeMove(move));
};
```

## 🚀 Benefits of This Redux Setup

1. **Centralized State**: All app state in one place
2. **Predictable Updates**: State changes through actions only
3. **Time Travel Debugging**: Redux DevTools support
4. **Persistence**: User preferences and settings persist
5. **Scalability**: Easy to add new features
6. **Testing**: Easy to test state logic
7. **Performance**: Optimized re-renders
8. **Developer Experience**: Great debugging tools

## 🔧 Configuration

### Redux DevTools
The store is configured with Redux DevTools for development:
```javascript
devTools: __DEV__,
```

### Persistence
User preferences and UI settings are persisted:
```javascript
whitelist: ['user', 'ui'],
blacklist: ['game', 'multiplayer'],
```

### Error Handling
Comprehensive error handling in all slices with proper error states.

## 📱 Integration with Your App

The Redux provider is already integrated into your main layout (`app/_layout.js`):

```javascript
<ReduxProvider>
  <MusicProvider>
    <ClickSoundProvider>
      <ExitConfirmProvider>
        <InnerLayout />
      </ExitConfirmProvider>
    </ClickSoundProvider>
  </MusicProvider>
</ReduxProvider>
```

## 🎯 Next Steps

1. **Start Using Redux**: Begin migrating components to use Redux
2. **Add More Features**: Extend slices with additional functionality
3. **Testing**: Add unit tests for Redux logic
4. **Performance**: Optimize selectors for better performance
5. **Documentation**: Document your specific use cases

## 🆘 Troubleshooting

### Common Issues:

1. **State Not Updating**: Check if you're using the correct action
2. **Persistence Issues**: Verify AsyncStorage permissions
3. **Performance**: Use selectors to prevent unnecessary re-renders
4. **TypeScript**: Add proper types for better development experience

### Debug Tools:

- Redux DevTools Extension
- React Native Debugger
- Console logging in actions
- Redux state inspection

## 📚 Resources

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Redux Hooks](https://react-redux.js.org/api/hooks)
- [Redux Persist](https://github.com/rt2zz/redux-persist)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)

Your ChessMate app now has a robust, scalable state management system that will make it easier to add new features and maintain the codebase! 🎉
