import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import store from './src/redux/store'; // Assuming store is exported from here
import AppNavigation from './src/navigation/AppNavigation'; // Import the main navigator
import { StatusBar } from 'expo-status-bar'; // Import StatusBar

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <AppNavigation />
        <StatusBar style="auto" /> {/* Optional: Add status bar */}
      </NavigationContainer>
    </Provider>
  );
}
