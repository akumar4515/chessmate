// app/components/ExitConfirmProvider.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { BackHandler } from 'react-native';
import ExitConfirmDialog from './ExitConfirmDialog';

const ExitConfirmCtx = createContext(null);

export function ExitConfirmProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const onExit = useCallback(() => { setVisible(false); BackHandler.exitApp(); }, []);
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
