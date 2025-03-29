import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { COLORS } from '../../config/constants';

const UserProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  
  const { user: currentUser } = useSelector(state => state.auth);
  const isCurrentUser = userId === currentUser?.id;
  
  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        
        // In a real app, this would fetch from an API
        // For now, we'll use mock data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock user data
        const mockUser = {
          _id: userId,
          username: isCurrentUser ? currentUser.username : 'jane_smith',
          fullName: isCurrentUser ? (currentUser.fullName || currentUser.username) : 'Jane Smith',
          email: isCurrentUser ? currentUser.email : 'jane.smith@example.com',
          profilePicture: null,
          bio: 'Professional photographer and designer',
          joinedAt: '2024-12-10T08:30:00.000Z',
          isOnline: true,
          lastActive: new Date().toISOString(),
          isBlocked: false,
          isMuted: false
        };
        
        setUserProfile(mockUser);
        setIsLoading(false);
        
        // Fetch shared media
        fetchSharedMedia();
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setIsLoading(false);
        Alert.alert('Error', 'Failed to load user profile');
      }
    };
    
    fetchUserProfile();
  }, [userId, isCurrentUser, currentUser]);
  
  // Fetch shared media
  const fetchSharedMedia = async () => {
    try {
      setIsLoadingMedia(true);
      
      // In a real app, this would fetch from an API
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock media data
      const mockMedia = [
        {
          _id: 'media1',
          type: 'image',
          thumbnailUrl: 'https://via.placeholder.com/150',
          url: 'https://via.placeholder.com/800x600',
          width: 800,
          height: 600,
          createdAt: '2025-03-15T14:30:00.000Z'
        },
        {
          _id: 'media2',
          type: 'image',
          thumbnailUrl: 'https://via.placeholder.com/150',
          url: 'https://via.placeholder.com/600x800',
          width: 600,
          height: 800,
          createdAt: '2025-03-10T09:45:00.000Z'
        },
        {
          _id: 'media3',
          type: 'video',
          thumbnailUrl: 'https://via.placeholder.com/150',
          url: 'https://example.com/video.mp4',
          width: 1280,
          height: 720,
          duration: 45,
          createdAt: '2025-03-05T16:20:00.000Z'
        },
        {
          _id: 'media4',
          type: 'image',
          thumbnailUrl: 'https://via.placeholder.com/150',
          url: 'https://via.placeholder.com/800x800',
          width: 800,
          height: 800,
          createdAt: '2025-02-28T11:15:00.000Z'
        }
      ];
      
      setSharedMedia(mockMedia);
      setIsLoadingMedia(false);
    } catch (error) {
      console.error('Error fetching shared media:', error);
      setIsLoadingMedia(false);
    }
  };
  
  // Handle block/unblock user
  const handleToggleBlock = () => {
    if (isCurrentUser) return;
    
    const action = userProfile.isBlocked ? 'unblock' : 'block';
    
    Alert.alert(
      `${userProfile.isBlocked ? 'Unblock' : 'Block'} User`,
      `Are you sure you want to ${action} ${userProfile.username}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              // In a real app, this would call an API
              // For now, we'll just simulate a delay
              await new Promise(resolve => setTimeout(resolve, 800));
              
              // Update local state
              setUserProfile(prev => ({
                ...prev,
                isBlocked: !prev.isBlocked
              }));
              
              Alert.alert('Success', `User ${action}ed successfully`);
            } catch (error) {
              console.error(`Error ${action}ing user:`, error);
              Alert.alert('Error', `Failed to ${action} user`);
            }
          }
        }
      ]
    );
  };
  
  // Handle mute/unmute user
  const handleToggleMute = () => {
    if (isCurrentUser) return;
    
    const action = userProfile.isMuted ? 'unmute' : 'mute';
    
    Alert.alert(
      `${userProfile.isMuted ? 'Unmute' : 'Mute'} User`,
      `Are you sure you want to ${action} ${userProfile.username}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              // In a real app, this would call an API
              // For now, we'll just simulate a delay
              await new Promise(resolve => setTimeout(resolve, 800));
              
              // Update local state
              setUserProfile(prev => ({
                ...prev,
                isMuted: !prev.isMuted
              }));
              
              Alert.alert('Success', `User ${action}d successfully`);
            } catch (error) {
              console.error(`Error ${action}ing user:`, error);
              Alert.alert('Error', `Failed to ${action} user`);
            }
          }
        }
      ]
    );
  };
  
  // Handle starting a conversation
  const handleStartConversation = () => {
    if (isCurrentUser) return;
    
    // In a real app, this would create or navigate to an existing conversation
    navigation.navigate('Chat', {
      conversationId: `direct-${userId}`,
      name: userProfile.fullName || userProfile.username,
      isGroup: false
    });
  };
  
  // Render media item
  const renderMediaItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.mediaItem}
        onPress={() => {
          navigation.navigate('MediaViewer', {
            media: item,
            type: item.type
          });
        }}
      >
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.mediaThumbnail}
          resizeMode="cover"
        />
        {item.type === 'video' && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play" size={16} color={COLORS.WHITE} />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            {userProfile.profilePicture ? (
              <Image source={{ uri: userProfile.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {userProfile.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            {userProfile.isOnline && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
          
          <Text style={styles.fullName}>{userProfile.fullName}</Text>
          <Text style={styles.username}>@{userProfile.username}</Text>
          
          {userProfile.bio && (
            <Text style={styles.bio}>{userProfile.bio}</Text>
          )}
          
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {new Date(userProfile.joinedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {userProfile.isOnline ? 'Online' : 'Recently'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
          
          {!isCurrentUser && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleStartConversation}
            >
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.WHITE} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Shared Media</Text>
          
          {isLoadingMedia ? (
            <View style={styles.mediaLoadingContainer}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            </View>
          ) : sharedMedia.length > 0 ? (
            <View>
              <FlatList
                data={sharedMedia}
                renderItem={renderMediaItem}
                keyExtractor={item => item._id}
                numColumns={3}
                scrollEnabled={false}
                contentContainerStyle={styles.mediaGrid}
              />
              
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('MediaGallery', { userId })}
              >
                <Text style={styles.viewAllButtonText}>View All Media</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyMediaContainer}>
              <Ionicons name="images-outline" size={48} color={COLORS.MUTED} />
              <Text style={styles.emptyMediaText}>No shared media</Text>
            </View>
          )}
        </View>
        
        {!isCurrentUser && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.mutedButton]}
              onPress={handleToggleMute}
            >
              <Ionicons
                name={userProfile.isMuted ? 'notifications-off-outline' : 'notifications-outline'}
                size={20}
                color={COLORS.TEXT}
              />
              <Text style={styles.actionButtonText}>
                {userProfile.isMuted ? 'Unmute User' : 'Mute User'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleToggleBlock}
            >
              <Ionicons
                name={userProfile.isBlocked ? 'person-add-outline' : 'person-remove-outline'}
                size={20}
                color={COLORS.DANGER}
              />
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                {userProfile.isBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.SUCCESS,
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  statDivider: {
    height: 24,
    width: 1,
    backgroundColor: COLORS.BORDER,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  messageButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  sectionContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
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
  mediaGrid: {
    marginHorizontal: -4,
  },
  mediaItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    position: 'relative',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  actionsContainer: {
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  mutedButton: {
    backgroundColor: COLORS.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  dangerButton: {
    backgroundColor: COLORS.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.DANGER,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT,
    marginLeft: 8,
  },
  dangerButtonText: {
    color: COLORS.DANGER,
  },
});

export default UserProfileScreen;
