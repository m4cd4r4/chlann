import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import AppNavigation from './src/navigation/AppNavigation';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppNavigation />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </Provider>
  );
}
