import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function ChatScreen({ route, navigation }) {
  const { otherUser, item, transaction } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (otherUser && user) {
      const title = item ? `${otherUser.name} - ${item.title}` : otherUser.name || 'Chat';
      navigation.setOptions({ title: title });
      loadMessages();
      setupRealtimeSubscription();
    }

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [otherUser, user, item]);

  const loadMessages = async () => {
    if (!user || !otherUser) return;

    try {
      setInitialLoading(true);
      
      // Build query based on whether we have item context
      let query = supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${user.id})`);
      
      // If we have item context, try to filter by item (fallback if column doesn't exist)
      if (item) {
        try {
          query = query.eq('item_id', item.id);
        } catch (e) {
          // If item_id column doesn't exist, just use the basic query
          console.warn('item_id column not available, falling back to basic messaging');
        }
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
      
      // Mark messages as read
      if (data && data.length > 0) {
        const unreadMessages = data.filter(msg => 
          msg.receiver_id === user.id && !msg.read
        );
        
        if (unreadMessages.length > 0) {
          await markMessagesAsRead(unreadMessages.map(msg => msg.id));
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setInitialLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user || !otherUser) return;

    // Clean up any existing channel before creating a new one
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (e) {
        // ignore
      }
    }

    // Use single-column filters to ensure compatibility with Realtime filter rules
    // 1) Incoming messages to the current user
    const filterIncoming = `receiver_id=eq.${user.id}`;
    // 2) Outgoing messages from the current user
    const filterOutgoing = `sender_id=eq.${user.id}`;

    const channel = supabase
      .channel(`chat:${user.id}:${otherUser.id}${item ? `:${item.id}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: filterOutgoing,
        },
        (payload) => {
          const newMsg = payload.new;
          // Ensure the message belongs to this conversation (other user and optional item)
          if (
            newMsg.receiver_id === otherUser.id &&
            (!item || newMsg.item_id === item.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [newMsg, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: filterIncoming,
        },
        (payload) => {
          const newMsg = payload.new;
          // Ensure the message belongs to this conversation (other user and optional item)
          if (
            newMsg.sender_id === otherUser.id &&
            (!item || newMsg.item_id === item.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [newMsg, ...prev];
            });

            // Mark as read if it's for the current user
            if (newMsg.receiver_id === user.id && !newMsg.read) {
              markMessagesAsRead([newMsg.id]);
            }
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  };

  const markMessagesAsRead = async (messageIds) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .in('id', messageIds);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !otherUser) return;

    setLoading(true);
    try {
      const messageData = {
        sender_id: user.id,
        receiver_id: otherUser.id,
        content: newMessage.trim(),
        read: false
      };

      // Add item/transaction context if available (will be ignored if columns don't exist)
      if (item) {
        messageData.item_id = item.id;
      }
      if (transaction) {
        messageData.transaction_id = transaction.id;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        // If error is about missing columns, try without item/transaction context
        if (error.code === '42703' && (item || transaction)) {
          console.warn('Item/transaction columns not available, sending basic message');
          const basicMessageData = {
            sender_id: user.id,
            receiver_id: otherUser.id,
            content: newMessage.trim(),
            read: false
          };
          const { data: basicData, error: basicError } = await supabase
            .from('messages')
            .insert([basicMessageData])
            .select()
            .single();
          if (basicError) throw basicError;

          // Optimistically add the message to the UI
          setMessages((prev) => [basicData, ...prev]);
          setNewMessage('');
          return;
        }
        throw error;
      }

      // Optimistically add the message to the UI
      setMessages((prev) => [data, ...prev]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === user.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          !item.read && !isMyMessage && styles.unreadMessage
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
        </View>
        <View style={styles.messageMeta}>
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isMyMessage && (
            <Text style={[styles.messageStatus, item.read && styles.messageRead]}>
              {item.read ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (!otherUser || !user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No user selected for chat</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {item && (
        <View style={styles.itemHeader}>
          <Image 
            source={{ 
              uri: item.photo_url || 'https://via.placeholder.com/60x60?text=Item' 
            }} 
            style={styles.itemHeaderImage} 
          />
          <View style={styles.itemHeaderInfo}>
            <Text style={styles.itemHeaderTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.itemHeaderType}>{item.type}</Text>
          </View>
        </View>
      )}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        inverted
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!newMessage.trim() || loading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 5,
  },
  otherMessageBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 5,
  },
  unreadMessage: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: COLORS.text,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 5,
  },
  messageStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 5,
  },
  messageRead: {
    color: COLORS.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 50,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemHeaderImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemHeaderInfo: {
    flex: 1,
  },
  itemHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  itemHeaderType: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
});