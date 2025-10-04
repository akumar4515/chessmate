import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';

// Loading component for PersistGate
const LoadingComponent = () => {
  return null; // You can customize this loading component
};

// Redux Provider wrapper component
const ReduxProvider = ({ children }) => {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingComponent />} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
};

export default ReduxProvider;
