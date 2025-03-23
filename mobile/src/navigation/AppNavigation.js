import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main screens
import ConversationsScreen from '../screens/main/ConversationsScreen';
import SearchScreen from '../screens/main/SearchScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

// Chat screens
import ChatScreen from '../screens/chat/ChatScreen';
import MediaViewerScreen from '../screens/chat/MediaViewerScreen';
import GroupInfoScreen from '../screens/chat/GroupInfoScreen';
import UserProfileScreen from '../screens/chat/UserProfileScreen';

// Redux
import { loadUser, refreshToken } from '../redux/slices/authSlice';
import { COLORS } from '../config/constants';

// Create navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Conversations') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.MUTED,
      })}
    >
      <Tab.Screen 
        name="Conversations" 
        component={ConversationsScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

// Main navigation component
const AppNavigation = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useSelector(state => state.auth);
  
  useEffect(() => {
    // Check for stored tokens on startup
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
        
        if (token) {
          // Try to load user with existing token
          dispatch(loadUser());
        } else if (refreshTokenValue) {
          // Try to refresh token if access token is missing
          dispatch(refreshToken());
        }
      } catch (error) {
        console.error('Authentication check error:', error);
      }
    };
    
    checkAuth();
  }, [dispatch]);
  
  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isAuthenticated ? (
          // Auth Stack
          <Stack.Group>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPasswordScreen} 
              options={{ headerTitle: 'Reset Password' }}
            />
          </Stack.Group>
        ) : (
          // Main App Stack
          <Stack.Group>
            <Stack.Screen 
              name="Main" 
              component={MainTabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen} 
              options={({ route }) => ({ 
                headerTitle: route.params?.name || 'Chat',
                headerBackTitle: 'Back'
              })}
            />
            <Stack.Screen 
              name="MediaViewer" 
              component={MediaViewerScreen} 
              options={{ 
                headerShown: false,
                presentation: 'modal' 
              }}
            />
            <Stack.Screen 
              name="GroupInfo" 
              component={GroupInfoScreen} 
              options={{ headerTitle: 'Group Info' }}
            />
            <Stack.Screen 
              name="UserProfile" 
              component={UserProfileScreen} 
              options={{ headerTitle: 'Profile' }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;
