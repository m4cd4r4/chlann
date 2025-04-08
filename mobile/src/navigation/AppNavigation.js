import React from 'react';
import { useSelector } from 'react-redux'; // Import useSelector
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import Screens and Navigators
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'; // Import ForgotPasswordScreen
import MainTabNavigator from './MainTabNavigator'; // Import the new Tab Navigator

const Stack = createNativeStackNavigator();

const AppNavigation = () => {
  // Get authentication status from Redux store
  // Adjust the selector based on your actual authSlice state structure
  const isAuthenticated = useSelector((state) => !!state.auth.accessToken); 

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // User is logged in, show the main app (Tab Navigator)
        <Stack.Screen name="MainApp" component={MainTabNavigator} />
      ) : (
        // User is not logged in, show the auth screens
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          {/* Add RegisterScreen here if/when created */}
          {/* <Stack.Screen name="Register" component={RegisterScreen} /> */}
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigation;
