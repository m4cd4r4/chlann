import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  SafeAreaView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchConversations, setCurrentConversation } from '../../redux/slices/conversationSlice';
import { COLORS } from '../../config/constants';
import { format } from 'date-fns';

const ConversationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { conversations, isLoading, error } = useSelector(state => state.conversations);
  const { user } = useSelector(state => state.auth);
  const { typingUsers, onlineUsers } = useSelector(state => state.ui);
  
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch conversations on component mount
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);
  
  // Handle refreshing conversations
  const handleRefresh = () => {
    setRefreshing(true);
    dispatch(fetchConversations()).then(() => setRefreshing(false));
  };
  
  // Handle navigating to a chat
  const handleChatPress = (conversation) => {
    dispatch(setCurrentConversation(conversation));
    
    navigation.navigate('Chat', {
      conversationId: conversation._id,
      name: conversation.isGroupChat ? conversation.name : getRecipientName(conversation),
      isGroup: conversation.isGroupChat
    });
  };
  
  // Get recipient name for direct conversations
  const getRecipientName = (conversation) => {
    if (conversation.isGroupChat) return conversation.name;
    
    const recipient = conversation.participants.find(
      participant => participant._id !== user.id
    );
    
    return recipient ? recipient.username : 'Unknown User';
  };
  
  // Get the last message preview text
  const getLastMessagePreview = (conversation) => {
    const { lastMessage } = conversation;
    
    if (!lastMessage) return 'No messages yet';
    
    // Check if the message is from the current user
    const isOwnMessage = lastMessage.sender?._id === user.id;
    const prefix = isOwnMessage ? 'You: ' : '';
    
    // Check message type
    switch (lastMessage.type) {
      case 'text':
        return `${prefix}${lastMessage.content}`;
      case 'image':
        return `${prefix}📷 Photo`;
      case 'video':
        return `${prefix}🎥 Video`;
      case 'link':
        return `${prefix}🔗 Link`;
      case 'system':
        return lastMessage.content;
      default:
        return `${prefix}Message`;
    }
  };
  
  // Check if someone is typing in a conversation
  const isTyping = (conversationId) => {
    return typingUsers[conversationId] && typingUsers[conversationId].length > 0;
  };
  
  // Get recipient profile picture for direct conversations
  const getRecipientProfilePic = (conversation) => {
    if (conversation.isGroupChat) {
      return null; // Group placeholder image will be used
    }
    
    const recipient = conversation.participants.find(
      participant => participant._id !== user.id
    );
    
    return recipient?.profilePicture || null;
  };
  
  // Check if recipient is online for direct conversations
  const isRecipientOnline = (conversation) => {
    if (conversation.isGroupChat) return false;
    
    const recipient = conversation.participants.find(
      participant => participant._id !== user.id
    );
    
    return recipient && onlineUsers[recipient._id];
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // Check if this week
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    
    if (date > weekAgo) {
      return format(date, 'EEE');
    }
    
    // Older messages
    return format(date, 'MM/dd/yyyy');
  };
  
  // Render conversation item
  const renderConversationItem = ({ item }) => {
    const recipientName = getRecipientName(item);
    const lastMessagePreview = getLastMessagePreview(item);
    const time = item.lastMessage ? formatTime(item.lastMessage.createdAt) : '';
    const unreadCount = item.unreadCount || 0;
    const typing = isTyping(item._id);
    const recipientProfilePic = getRecipientProfilePic(item);
    const online = isRecipientOnline(item);
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleChatPress(item)}
      >
        <View style={styles.avatarContainer}>
          {recipientProfilePic ? (
            <Image source={{ uri: recipientProfilePic }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar, item.isGroupChat && styles.groupAvatar]}>
              <Text style={styles.avatarText}>
                {item.isGroupChat ? recipientName.charAt(0) : recipientName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {online && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {recipientName}
            </Text>
            <Text style={styles.timeText}>{time}</Text>
          </View>
          
          <View style={styles.conversationFooter}>
            {typing ? (
              <Text style={styles.typingText}>Typing...</Text>
            ) : (
              <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
                {lastMessagePreview}
              </Text>
            )}
            
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render empty conversations
  const renderEmptyConversations = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={COLORS.MUTED} />
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptySubtext}>Start a new conversation by tapping the button below</Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversations</Text>
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={() => navigation.navigate('NewConversation')}
        >
          <Ionicons name="create-outline" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>
      
      {isLoading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={item => item._id}
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : null}
          ListEmptyComponent={renderEmptyConversations}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.PRIMARY]}
            />
          }
        />
      )}
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('NewConversation')}
      >
        <Ionicons name="add" size={24} color={COLORS.WHITE} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  newChatButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderAvatar: {
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    backgroundColor: COLORS.SECONDARY,
  },
  avatarText: {
    color: COLORS.WHITE,
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.SUCCESS,
    borderWidth: 2,
    borderColor: COLORS.BACKGROUND,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.MUTED,
    marginLeft: 8,
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.MUTED,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  typingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.PRIMARY,
  },
  unreadBadge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    height: 24,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.MUTED,
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: COLORS.PRIMARY,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default ConversationsScreen;
