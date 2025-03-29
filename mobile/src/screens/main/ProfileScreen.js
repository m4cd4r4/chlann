import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { logout, updateProfile } from '../../redux/slices/authSlice';
import { COLORS } from '../../config/constants';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user, isLoading } = useSelector(state => state.auth);
  
  const [mediaCount, setMediaCount] = useState(0);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  
  // Fetch user's media count
  useEffect(() => {
    const fetchMediaCount = async () => {
      try {
        // In a real app, this would call an API endpoint
        // For now, we'll just simulate a fetch with mock data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock media count
        setMediaCount(42);
      } catch (error) {
        console.error('Error fetching media count:', error);
      } finally {
        setIsLoadingMedia(false);
      }
    };
    
    fetchMediaCount();
  }, []);
  
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
  
  const handleEditProfile = () => {
    // In a real app, this would navigate to an edit profile screen
    Alert.alert(
      'Edit Profile',
      'This feature is not implemented yet.',
      [{ text: 'OK' }]
    );
  };
  
  const handleViewMedia = () => {
    navigation.navigate('MediaGallery');
  };
  
  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user.username?.charAt(0).toUpperCase() || 'U'}</Text>
              </View>
            )}
            
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{user.username || 'Username'}</Text>
              <Text style={styles.email}>{user.email || 'email@example.com'}</Text>
              
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{isLoadingMedia ? '-' : mediaCount}</Text>
              <Text style={styles.statLabel}>Media</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Conversations</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Media</Text>
          
          {isLoadingMedia ? (
            <View style={styles.mediaLoadingContainer}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            </View>
          ) : mediaCount > 0 ? (
            <View>
              <View style={styles.mediaPreviewContainer}>
                {/* Mock media preview - in a real app, these would be actual images */}
                <View style={styles.mediaItem} />
                <View style={styles.mediaItem} />
                <View style={styles.mediaItem} />
                <View style={styles.mediaItem} />
              </View>
              
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={handleViewMedia}
              >
                <Text style={styles.viewAllButtonText}>View All Media</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyMediaContainer}>
              <Ionicons name="images-outline" size={48} color={COLORS.MUTED} />
              <Text style={styles.emptyMediaText}>No media shared yet</Text>
            </View>
          )}
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingsContainer}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="notifications-outline" size={24} color={COLORS.PRIMARY} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>Manage notification preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="lock-closed-outline" size={24} color={COLORS.PRIMARY} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Privacy</Text>
                <Text style={styles.settingDescription}>Control your privacy settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="help-circle-outline" size={24} color={COLORS.PRIMARY} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Help & Support</Text>
                <Text style={styles.settingDescription}>Get help and contact support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, styles.lastSettingItem]}
              onPress={handleLogout}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="log-out-outline" size={24} color={COLORS.DANGER} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: COLORS.DANGER }]}>Logout</Text>
                <Text style={styles.settingDescription}>Sign out of your account</Text>
              </View>
            </TouchableOpacity>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  logoutButton: {
    padding: 8,
  },
  profileSection: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.BORDER,
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  mediaLoadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mediaItem: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  viewAllButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyMediaContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyMediaText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  settingsContainer: {
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default ProfileScreen;
