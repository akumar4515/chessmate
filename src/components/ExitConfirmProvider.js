// src/components/ExitConfirmProvider.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ExitConfirmDialog from '../../src/components/ExitConfirmDialog';

const ExitConfirmCtx = createContext(null);

export function ExitConfirmProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  
  const onExit = useCallback(async () => {
    try {
      console.log('User confirmed app exit - clearing session data...');
      
      // Clear all session data before exiting
      await AsyncStorage.removeItem('appSession');
      await AsyncStorage.removeItem('appBackgroundTime');
      
      setVisible(false);
      BackHandler.exitApp();
    } catch (error) {
      console.error('Error clearing session on exit:', error);
      // Still exit the app even if session clearing fails
      setVisible(false);
      BackHandler.exitApp();
    }
  }, []);
  
  return (
    <ExitConfirmCtx.Provider value={{ open, close }}>
      {children}
      <ExitConfirmDialog visible={visible} onCancel={close} onExit={onExit} />
    </ExitConfirmCtx.Provider>
  );
}

export function useExitConfirm() {
  const ctx = useContext(ExitConfirmCtx);
  if (!ctx) throw new Error('useExitConfirm must be used within ExitConfirmProvider');
  return ctx;
}


