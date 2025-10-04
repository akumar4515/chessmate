import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import gameReducer from './slices/gameSlice';
import userReducer from './slices/userSlice';
import uiReducer from './slices/uiSlice';
import multiplayerReducer from './slices/multiplayerSlice';

// Persist config
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['user', 'ui'], // Only persist user and UI state
  blacklist: ['game', 'multiplayer'], // Don't persist game state
};

// Root reducer
const rootReducer = combineReducers({
  game: gameReducer,
  user: userReducer,
  ui: uiReducer,
  multiplayer: multiplayerReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: __DEV__,
});

// Persistor
export const persistor = persistStore(store);

// Types (for TypeScript projects, rename this file to .ts)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
