import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchMessages, sendMessage, addPendingMessage } from '../../redux/slices/messageSlice';
import { markConversationAsRead } from '../../redux/slices/conversationSlice';
import { userStartedTyping, userStoppedTyping } from '../../redux/slices/uiSlice';
import { COLORS, CONSTANTS } from '../../config/constants';
import SocketService from '../../services/socketService';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { v4 as uuidv4 } from 'uuid';
import MediaService from '../../services/mediaService';

const ChatScreen = ({ route, navigation }) => {
  const { conversationId, isGroup } = route.params;
  const dispatch = useDispatch();
  
  const { messages: allMessages, hasMore, isLoading } = useSelector(state => state.messages);
  const { user } = useSelector(state => state.auth);
  const { typingUsers } = useSelector(state => state.ui);
  
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  
  const messages = allMessages[conversationId] || [];
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Fetch messages and join conversation on component mount
  useEffect(() => {
    dispatch(fetchMessages({ conversationId }));
    dispatch(markConversationAsRead(conversationId));
    
    // Join conversation room via Socket.IO
    try {
      const socket = SocketService.getSocket();
      SocketService.joinConversation(conversationId);
    } catch (error) {
      console.error('Socket error:', error);
    }
    
    // Clean up on unmount
    return () => {
      try {
        SocketService.leaveConversation(conversationId);
        
        // Cancel typing indicator if unmounted while typing
        if (isTyping) {
          SocketService.sendTypingStop(conversationId);
        }
      } catch (error) {
        console.error('Socket cleanup error:', error);
      }
    };
  }, [dispatch, conversationId, isTyping]);
  
  // Handle typing indicator
  useEffect(() => {
    if (message.length > 0 && !isTyping) {
      setIsTyping(true);
      SocketService.sendTypingStart(conversationId);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout for typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        SocketService.sendTypingStop(conversationId);
      }
    }, CONSTANTS.TYPING_TIMEOUT);
    
    // Clean up timeout on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, conversationId]);
  
  // Load more messages when scrolling up
  const handleLoadEarlier = async () => {
    if (hasMore[conversationId] && !loadingEarlier) {
      setLoadingEarlier(true);
      
      const oldestMessage = messages[0];
      
      if (oldestMessage) {
        await dispatch(fetchMessages({
          conversationId,
          before: oldestMessage._id
        }));
      }
      
      setLoadingEarlier(false);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (message.trim() === '') return;
    
    // Generate temporary ID for optimistic update
    const tempId = uuidv4();
    
    // Create pending message for optimistic update
    const pendingMessage = {
      _id: tempId,
      tempId,
      content: message,
      sender: {
        _id: user.id,
        username: user.username,
        profilePicture: user.profilePicture
      },
      conversation: conversationId,
      type: 'text',
      status: 'sending',
      createdAt: new Date().toISOString()
    };
    
    // Add to pending messages for optimistic update
    dispatch(addPendingMessage(pendingMessage));
    
    // Send message to server
    dispatch(sendMessage({
      conversationId,
      content: message,
      type: 'text'
    }));
    
    // Clear input
    setMessage('');
    
    // Stop typing indicator
    setIsTyping(false);
    SocketService.sendTypingStop(conversationId);
  };
  
  // Pick image from gallery
  const handleImagePicker = async () => {
    setAttachmentMenuVisible(false);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        handleSendMediaMessages(result.assets, 'image');
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };
  
  // Take photo with camera
  const handleCameraLaunch = async () => {
    setAttachmentMenuVisible(false);
    
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Sorry, we need camera permissions to take photos!');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        handleSendMediaMessages(result.assets, 'image');
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };
  
  // Pick video from gallery
  const handleVideoPicker = async () => {
    setAttachmentMenuVisible(false);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 60,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        handleSendMediaMessages(result.assets, 'video');
      }
    } catch (error) {
      console.error('Video picker error:', error);
    }
  };
  
  // Pick document
  const handleDocumentPicker = async () => {
    setAttachmentMenuVisible(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      
      if (result.canceled === false && result.assets.length > 0) {
        // Handle document sending logic here
        console.log('Selected documents:', result.assets);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };
  
  // Process and send media messages
  const handleSendMediaMessages = async (assets, type) => {
    // Process each asset
    assets.forEach(async (asset) => {
      // Create form data for upload
      const formData = new FormData();
      
      // Append file
      const fileExtension = asset.uri.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      
      formData.append('media', {
        uri: asset.uri,
        name: fileName,
        type: asset.mimeType || `${type}/${fileExtension}`
      });
      
      formData.append('conversationId', conversationId);
      
      // Generate temporary ID for optimistic update
      const tempId = uuidv4();
      
      // Create pending message for optimistic update
      const pendingMessage = {
        _id: tempId,
        tempId,
        sender: {
          _id: user.id,
          username: user.username,
          profilePicture: user.profilePicture
        },
        conversation: conversationId,
        type,
        media: [{
          url: asset.uri,
          type,
          width: asset.width,
          height: asset.height,
          duration: asset.duration
        }],
        status: 'sending',
        createdAt: new Date().toISOString()
      };
      
      // Add to pending messages for optimistic update
      dispatch(addPendingMessage(pendingMessage));
      
      try {
        // Upload media
        const mediaResponse = await MediaService.uploadMedia(formData, (progress) => {
          console.log(`Upload progress: ${progress}%`);
        });
        
        // Send message with uploaded media
        dispatch(sendMessage({
          conversationId,
          content: '',
          type,
          media: [{
            url: mediaResponse.media.originalUrl,
            thumbnailUrl: mediaResponse.media.thumbnailUrl,
            type,
            width: mediaResponse.media.width,
            height: mediaResponse.media.height,
            duration: mediaResponse.media.duration
          }]
        }));
      } catch (error) {
        console.error('Media upload error:', error);
        // Todo: Handle upload error and update UI
      }
    });
  };
  
  // Render message item
  const renderMessageItem = ({ item }) => {
    const isOwnMessage = item.sender?._id === user.id;
    
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer]}>
        {!isOwnMessage && !isGroup && (
          item.sender?.profilePicture ? (
            <Image
              source={{ uri: item.sender.profilePicture }}
              style={styles.messageSenderAvatar}
            />
          ) : (
            <View style={styles.messageSenderAvatarPlaceholder}>
              <Text style={styles.messageSenderAvatarText}>
                {item.sender?.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )
        )}
        
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble]}>
          {isGroup && !isOwnMessage && (
            <Text style={styles.messageSenderName}>{item.sender?.username || 'Unknown'}</Text>
          )}
          
          {item.type === 'text' && (
            <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
              {item.content}
            </Text>
          )}
          
          {item.type === 'image' && item.media && item.media.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('MediaViewer', {
                  media: item.media[0],
                  type: 'image'
                });
              }}
            >
              <Image
                source={{ uri: item.media[0].thumbnailUrl || item.media[0].url }}
                style={[
                  styles.messageImage,
                  {
                    aspectRatio: item.media[0].width / item.media[0].height,
                    width: Math.min(250, item.media[0].width),
                    height: undefined
                  }
                ]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          
          {item.type === 'video' && item.media && item.media.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('MediaViewer', {
                  media: item.media[0],
                  type: 'video'
                });
              }}
            >
              <View style={styles.videoContainer}>
                <Image
                  source={{ uri: item.media[0].thumbnailUrl }}
                  style={[
                    styles.messageVideo,
                    {
                      aspectRatio: item.media[0].width / item.media[0].height,
                      width: Math.min(250, item.media[0].width),
                      height: undefined
                    }
                  ]}
                  resizeMode="cover"
                />
                <View style={styles.videoPlayButton}>
                  <Ionicons name="play" size={24} color={COLORS.WHITE} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          
          {item.status === 'sending' && isOwnMessage && (
            <View style={styles.messageStatus}>
              <ActivityIndicator size="small" color={COLORS.MUTED} />
            </View>
          )}
          
          {item.status !== 'sending' && isOwnMessage && (
            <View style={styles.messageStatus}>
              <Ionicons
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                size={16}
                color={item.status === 'read' ? COLORS.PRIMARY : COLORS.MUTED}
              />
            </View>
          )}
        </View>
      </View>
    );
  };
  
  // Render load earlier button
  const renderLoadEarlierButton = () => {
    if (!hasMore[conversationId] || messages.length === 0) {
      return null;
    }
    
    return (
      <TouchableOpacity
        style={styles.loadEarlierButton}
        onPress={handleLoadEarlier}
        disabled={loadingEarlier}
      >
        {loadingEarlier ? (
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        ) : (
          <Text style={styles.loadEarlierButtonText}>Load earlier messages</Text>
        )}
      </TouchableOpacity>
    );
  };
  
  // Render typing indicator
  const renderTypingIndicator = () => {
    const typingUsersList = typingUsers[conversationId] || [];
    
    if (typingUsersList.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>
            {typingUsersList.length === 1 ? 'Typing...' : 'Several people are typing...'}
          </Text>
        </View>
      </View>
    );
  };
  
  // Render attachment menu
  const renderAttachmentMenu = () => {
    if (!attachmentMenuVisible) {
      return null;
    }
    
    return (
      <View style={styles.attachmentMenu}>
        <TouchableOpacity style={styles.attachmentOption} onPress={handleImagePicker}>
          <View style={[styles.attachmentIcon, { backgroundColor: COLORS.PRIMARY }]}>
            <Ionicons name="image" size={24} color={COLORS.WHITE} />
          </View>
          <Text style={styles.attachmentText}>Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.attachmentOption} onPress={handleCameraLaunch}>
          <View style={[styles.attachmentIcon, { backgroundColor: COLORS.SUCCESS }]}>
            <Ionicons name="camera" size={24} color={COLORS.WHITE} />
          </View>
          <Text style={styles.attachmentText}>Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.attachmentOption} onPress={handleVideoPicker}>
          <View style={[styles.attachmentIcon, { backgroundColor: COLORS.INFO }]}>
            <Ionicons name="videocam" size={24} color={COLORS.WHITE} />
          </View>
          <Text style={styles.attachmentText}>Video</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.attachmentOption} onPress={handleDocumentPicker}>
          <View style={[styles.attachmentIcon, { backgroundColor: COLORS.WARNING }]}>
            <Ionicons name="document" size={24} color={COLORS.WHITE} />
          </View>
          <Text style={styles.attachmentText}>Document</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {isLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.messagesList}
            inverted
            ListFooterComponent={renderLoadEarlierButton}
            ListHeaderComponent={renderTypingIndicator}
            onEndReached={handleLoadEarlier}
            onEndReachedThreshold={0.1}
          />
        )}
        
        {renderAttachmentMenu()}
        
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setAttachmentMenuVisible(!attachmentMenuVisible)}
          >
            <Ionicons name="add" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.MUTED}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          
          {message.trim() !== '' ? (
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Ionicons name="send" size={24} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.sendButton} onPress={handleCameraLaunch}>
              <Ionicons name="camera" size={24} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
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
  messagesList: {
    padding: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageSenderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageSenderAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageSenderAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: COLORS.SENT_BUBBLE,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.RECEIVED_BUBBLE,
    borderBottomLeftRadius: 4,
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: COLORS.SENT_TEXT,
  },
  otherMessageText: {
    color: COLORS.RECEIVED_TEXT,
  },
  messageImage: {
    borderRadius: 12,
  },
  videoContainer: {
    position: 'relative',
  },
  messageVideo: {
    borderRadius: 12,
  },
  videoPlayButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  messageStatus: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    backgroundColor: COLORS.BACKGROUND,
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.LIGHT,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    maxHeight: 120,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  sendButton: {
    padding: 8,
  },
  loadEarlierButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadEarlierButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
  },
  typingContainer: {
    padding: 10,
    marginBottom: 10,
  },
  typingBubble: {
    backgroundColor: COLORS.LIGHT,
    borderRadius: 16,
    padding: 10,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 14,
    color: COLORS.MUTED,
    fontStyle: 'italic',
  },
  attachmentMenu: {
    flexDirection: 'row',
    backgroundColor: COLORS.LIGHT,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  attachmentOption: {
    alignItems: 'center',
    marginRight: 24,
  },
  attachmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentText: {
    fontSize: 12,
    color: COLORS.TEXT,
  },
});

export default ChatScreen;
