import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS } from '../../config/constants';
import * as ImagePicker from 'expo-image-picker';

const GroupInfoScreen = ({ route, navigation }) => {
  const { conversationId } = route.params;
  const dispatch = useDispatch();
  
  const [isLoading, setIsLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { user } = useSelector(state => state.auth);
  
  // Fetch group information
  useEffect(() => {
    const fetchGroupInfo = async () => {
      try {
        setIsLoading(true);
        
        // In a real app, this would fetch from an API
        // For now, we'll use mock data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock group data
        const mockGroup = {
          _id: conversationId,
          name: 'Project Team',
          description: 'Group for project discussion and updates',
          avatar: null,
          createdAt: '2025-01-15T10:30:00.000Z',
          createdBy: {
            _id: 'user123',
            username: 'john_doe'
          },
          isPublic: false
        };
        
        // Mock participants
        const mockParticipants = [
          {
            _id: 'user123',
            username: 'john_doe',
            fullName: 'John Doe',
            avatar: null,
            isAdmin: true,
            joinedAt: '2025-01-15T10:30:00.000Z'
          },
          {
            _id: user.id,
            username: user.username,
            fullName: user.fullName || user.username,
            avatar: user.profilePicture,
            isAdmin: true,
            joinedAt: '2025-01-15T10:35:00.000Z'
          },
          {
            _id: 'user456',
            username: 'jane_smith',
            fullName: 'Jane Smith',
            avatar: null,
            isAdmin: false,
            joinedAt: '2025-01-15T11:00:00.000Z'
          },
          {
            _id: 'user789',
            username: 'mike_johnson',
            fullName: 'Mike Johnson',
            avatar: null,
            isAdmin: false,
            joinedAt: '2025-01-16T09:15:00.000Z'
          }
        ];
        
        setGroup(mockGroup);
        setParticipants(mockParticipants);
        
        // Check if current user is admin
        const currentUserParticipant = mockParticipants.find(p => p._id === user.id);
        setIsAdmin(currentUserParticipant?.isAdmin || false);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching group info:', error);
        setIsLoading(false);
        Alert.alert('Error', 'Failed to load group information');
      }
    };
    
    fetchGroupInfo();
  }, [conversationId, user.id]);
  
  // Handle changing group avatar
  const handleChangeAvatar = async () => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only group admins can change the group avatar');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        setIsUpdating(true);
        
        // In a real app, this would upload the image to a server
        // For now, we'll just simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update local state
        setGroup(prev => ({
          ...prev,
          avatar: result.assets[0].uri
        }));
        
        setIsUpdating(false);
        Alert.alert('Success', 'Group avatar updated successfully');
      }
    } catch (error) {
      console.error('Error changing avatar:', error);
      setIsUpdating(false);
      Alert.alert('Error', 'Failed to update group avatar');
    }
  };
  
  // Handle adding participants
  const handleAddParticipants = () => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only group admins can add participants');
      return;
    }
    
    // In a real app, this would navigate to a contact selection screen
    Alert.alert('Add Participants', 'This feature is not implemented yet');
  };
  
  // Handle removing a participant
  const handleRemoveParticipant = (participantId) => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only group admins can remove participants');
      return;
    }
    
    if (participantId === user.id) {
      Alert.alert('Error', 'You cannot remove yourself from the group');
      return;
    }
    
    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant from the group?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            
            // In a real app, this would call an API
            // For now, we'll just simulate a delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Update local state
            setParticipants(prev => prev.filter(p => p._id !== participantId));
            
            setIsUpdating(false);
            Alert.alert('Success', 'Participant removed successfully');
          }
        }
      ]
    );
  };
  
  // Handle making a participant an admin
  const handleToggleAdmin = (participantId, currentIsAdmin) => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only group admins can manage admin privileges');
      return;
    }
    
    const action = currentIsAdmin ? 'remove admin privileges from' : 'make';
    const preposition = currentIsAdmin ? 'from' : 'an admin of';
    
    Alert.alert(
      `${currentIsAdmin ? 'Remove Admin' : 'Make Admin'}`,
      `Are you sure you want to ${action} this participant ${preposition} the group?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsUpdating(true);
            
            // In a real app, this would call an API
            // For now, we'll just simulate a delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Update local state
            setParticipants(prev => prev.map(p => {
              if (p._id === participantId) {
                return { ...p, isAdmin: !currentIsAdmin };
              }
              return p;
            }));
            
            setIsUpdating(false);
            Alert.alert('Success', `Admin privileges ${currentIsAdmin ? 'removed' : 'granted'} successfully`);
          }
        }
      ]
    );
  };
  
  // Handle leaving the group
  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            
            // In a real app, this would call an API
            // For now, we'll just simulate a delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            setIsUpdating(false);
            
            // Navigate back to conversations
            navigation.navigate('Main');
          }
        }
      ]
    );
  };
  
  // Render participant item
  const renderParticipantItem = ({ item }) => {
    const isCurrentUser = item._id === user.id;
    
    return (
      <View style={styles.participantItem}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.participantAvatar} />
        ) : (
          <View style={styles.participantAvatarPlaceholder}>
            <Text style={styles.participantAvatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={styles.participantInfo}>
          <View style={styles.participantNameContainer}>
            <Text style={styles.participantName}>
              {item.fullName || item.username}
              {isCurrentUser && ' (You)'}
            </Text>
            {item.isAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.participantUsername}>@{item.username}</Text>
        </View>
        
        {isAdmin && !isCurrentUser && (
          <View style={styles.participantActions}>
            <TouchableOpacity
              style={styles.participantAction}
              onPress={() => handleToggleAdmin(item._id, item.isAdmin)}
            >
              <Ionicons
                name={item.isAdmin ? 'shield-outline' : 'shield'}
                size={20}
                color={COLORS.PRIMARY}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.participantAction}
              onPress={() => handleRemoveParticipant(item._id)}
            >
              <Ionicons name="remove-circle-outline" size={20} color={COLORS.DANGER} />
            </TouchableOpacity>
          </View>
        )}
      </View>
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
      {isUpdating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      )}
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleChangeAvatar}
            disabled={!isAdmin}
          >
            {group?.avatar ? (
              <Image source={{ uri: group.avatar }} style={styles.groupAvatar} />
            ) : (
              <View style={styles.groupAvatarPlaceholder}>
                <Text style={styles.groupAvatarText}>
                  {group?.name.charAt(0).toUpperCase() || 'G'}
                </Text>
              </View>
            )}
            
            {isAdmin && (
              <View style={styles.editAvatarButton}>
                <Ionicons name="camera" size={16} color={COLORS.WHITE} />
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.groupName}>{group?.name}</Text>
          
          {group?.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
          
          <View style={styles.groupStats}>
            <View style={styles.groupStat}>
              <Text style={styles.groupStatValue}>{participants.length}</Text>
              <Text style={styles.groupStatLabel}>Members</Text>
            </View>
            
            <View style={styles.groupStatDivider} />
            
            <View style={styles.groupStat}>
              <Text style={styles.groupStatValue}>
                {new Date(group?.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.groupStatLabel}>Created</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Participants</Text>
            
            {isAdmin && (
              <TouchableOpacity
                style={styles.addParticipantButton}
                onPress={handleAddParticipants}
              >
                <Ionicons name="person-add" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.addParticipantText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={participants}
            renderItem={renderParticipantItem}
            keyExtractor={item => item._id}
            scrollEnabled={false}
          />
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleLeaveGroup}
          >
            <Ionicons name="exit-outline" size={20} color={COLORS.DANGER} />
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              Leave Group
            </Text>
          </TouchableOpacity>
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
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
  groupAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  groupAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.PRIMARY,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 16,
  },
  groupStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  groupStat: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  groupStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  groupStatLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  groupStatDivider: {
    height: 24,
    width: 1,
    backgroundColor: COLORS.BORDER,
  },
  sectionContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addParticipantText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    marginLeft: 4,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  participantAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  participantAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  participantInfo: {
    flex: 1,
  },
  participantNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  participantUsername: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  participantActions: {
    flexDirection: 'row',
  },
  participantAction: {
    padding: 8,
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
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: COLORS.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.DANGER,
  },
  dangerButtonText: {
    color: COLORS.DANGER,
  },
});

export default GroupInfoScreen;
