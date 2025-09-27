import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function ConversationsScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadConversations();
      setupRealtimeSubscription();
    }
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // New incoming message for current user
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          // New outgoing message from current user
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Read status changes affecting current user's incoming messages
          loadConversations();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  };

  const loadConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Try to get messages with item and transaction data; fallback if columns don't exist
      let messages;
      let error;
    
      const result = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, name, photo_url),
          receiver:receiver_id(id, name, photo_url),
          item:item_id(id, title, photo_url, type),
          transaction:transaction_id(id, status)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
    
      if (result.error && result.error.code === '42703') {
        console.warn('Item/transaction columns not available, falling back to basic messaging');
        const fb = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(id, name, photo_url),
            receiver:receiver_id(id, name, photo_url)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
        messages = fb.data;
        error = fb.error;
      } else {
        messages = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Group messages by conversation (fallback to user-based grouping)
      const conversationsMap = new Map();
      
      messages.forEach(message => {
        const otherUser = message.sender_id === user.id ? message.receiver : message.sender;
        // Create conversation key based on item context if available, otherwise user-based
        const conversationKey = message.item_id ? `item_${message.item_id}` : `user_${otherUser.id}`;
        
        if (!conversationsMap.has(conversationKey)) {
          conversationsMap.set(conversationKey, {
            id: conversationKey,
            otherUser: otherUser,
            item: message.item || null,
            transaction: message.transaction || null,
            lastMessage: message,
            unreadCount: 0
          });
        }
        
        const conversation = conversationsMap.get(conversationKey);
        
        // Update last message if this one is newer
        if (new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
          conversation.lastMessage = message;
        }
        
        // Count unread messages
        if (message.receiver_id === user.id && !message.read) {
          conversation.unreadCount++;
        }
      });

      // Convert to array and sort by last message time
      const conversationsArray = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));

      setConversations(conversationsArray);
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const renderConversation = ({ item }) => {
    const { otherUser, lastMessage, unreadCount, item: conversationItem } = item;
    const isMyLastMessage = lastMessage.sender_id === user.id;
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Chat', { otherUser, item: conversationItem })}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ 
              uri: otherUser.photo_url || 'https://via.placeholder.com/50x50?text=U' 
            }}
            style={styles.avatar}
          />
          {conversationItem && (
            <Image
              source={{ 
                uri: conversationItem.photo_url || 'https://via.placeholder.com/30x30?text=Item' 
              }}
              style={styles.itemThumbnail}
            />
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>{otherUser.name}</Text>
            <Text style={styles.messageTime}>
              {new Date(lastMessage.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          
          {conversationItem && (
            <Text style={styles.itemTitle} numberOfLines={1}>
              About: {conversationItem.title}
            </Text>
          )}
          
          <View style={styles.messagePreviewContainer}>
            <Text 
              style={[
                styles.messagePreview,
                unreadCount > 0 && styles.unreadMessagePreview
              ]}
              numberOfLines={1}
            >
              {isMyLastMessage && 'You: '}
              {lastMessage.content}
            </Text>
            
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyText}>
        Start messaging other users to see your conversations here
      </Text>
      <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('MainTabs')}>
        <Text style={styles.exploreButtonText}>Explore Items</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadConversations}
        >
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  refreshButton: {
    padding: 5,
  },
  listContainer: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  itemThumbnail: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 10,
  },
  unreadMessagePreview: {
    color: COLORS.text,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});