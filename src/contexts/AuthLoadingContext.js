import React, { createContext, useContext, useState } from 'react';

const AuthLoadingContext = createContext();

export const AuthLoadingProvider = ({ children }) => {
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const setAuthLoading = (loading) => {
    setIsAuthLoading(loading);
  };

  return (
    <AuthLoadingContext.Provider value={{ isAuthLoading, setAuthLoading }}>
      {children}
    </AuthLoadingContext.Provider>
  );
};

export const useAuthLoading = () => {
  const context = useContext(AuthLoadingContext);
  if (!context) {
    throw new Error('useAuthLoading must be used within an AuthLoadingProvider');
  }
  return context;
};

