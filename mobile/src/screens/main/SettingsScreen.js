import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { COLORS } from '../../config/constants';

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [mediaAutoDownload, setMediaAutoDownload] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [highQualityMedia, setHighQualityMedia] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => dispatch(logout()),
          style: 'destructive',
        },
      ]
    );
  };
  
  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached media. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: () => {
            // In a real app, this would clear the cache
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };
  
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            // In a real app, this would delete the account
            Alert.alert('Not Implemented', 'This feature is not implemented yet');
          },
          style: 'destructive',
        },
      ]
    );
  };
  
  const renderSettingSwitch = (value, onValueChange) => (
    <Switch
      trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
      thumbColor={Platform.OS === 'ios' ? undefined : (value ? COLORS.WHITE : COLORS.LIGHT)}
      ios_backgroundColor={COLORS.BORDER}
      onValueChange={onValueChange}
      value={value}
    />
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enable Notifications</Text>
                <Text style={styles.settingDescription}>Receive push notifications</Text>
              </View>
              {renderSettingSwitch(notificationsEnabled, setNotificationsEnabled)}
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Message Notifications</Text>
                <Text style={styles.settingDescription}>Notifications for new messages</Text>
              </View>
              {renderSettingSwitch(notificationsEnabled, setNotificationsEnabled)}
            </View>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Notification Sounds</Text>
                <Text style={styles.settingDescription}>Customize notification sounds</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Media</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Auto-download Media</Text>
                <Text style={styles.settingDescription}>Automatically download media in chats</Text>
              </View>
              {renderSettingSwitch(mediaAutoDownload, setMediaAutoDownload)}
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>High Quality Media</Text>
                <Text style={styles.settingDescription}>Send and receive media in high quality</Text>
              </View>
              {renderSettingSwitch(highQualityMedia, setHighQualityMedia)}
            </View>
            
            <TouchableOpacity style={styles.settingItem} onPress={handleClearCache}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Clear Media Cache</Text>
                <Text style={styles.settingDescription}>Free up storage space</Text>
              </View>
              <Ionicons name="trash-outline" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Use dark theme</Text>
              </View>
              {renderSettingSwitch(darkModeEnabled, setDarkModeEnabled)}
            </View>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Text Size</Text>
                <Text style={styles.settingDescription}>Adjust text size in the app</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Read Receipts</Text>
                <Text style={styles.settingDescription}>Let others know when you've read their messages</Text>
              </View>
              {renderSettingSwitch(readReceipts, setReadReceipts)}
            </View>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Blocked Users</Text>
                <Text style={styles.settingDescription}>Manage your blocked users list</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>Read our privacy policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Change Password</Text>
                <Text style={styles.settingDescription}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Logout</Text>
                <Text style={styles.settingDescription}>Sign out of your account</Text>
              </View>
              <Ionicons name="log-out-outline" size={20} color={COLORS.DANGER} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={handleDeleteAccount}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: COLORS.DANGER }]}>Delete Account</Text>
                <Text style={styles.settingDescription}>Permanently delete your account and data</Text>
              </View>
              <Ionicons name="trash-outline" size={20} color={COLORS.DANGER} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Help & Support</Text>
                <Text style={styles.settingDescription}>Get help and contact support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Terms of Service</Text>
                <Text style={styles.settingDescription}>Read our terms of service</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>App Version</Text>
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>ChlannClaude © 2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  settingsGroup: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.MUTED,
  },
});

export default SettingsScreen;
