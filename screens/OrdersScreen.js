import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          items:items(id, title, photo_base64, type, price),
          owner:users!transactions_owner_id_fkey(id, name, photo_url),
          borrower:users!transactions_borrower_id_fkey(id, name, photo_url)
        `)
        .or(`owner_id.eq.${user.id},borrower_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load pickup photos (if any) for each order from Storage or base64 on transaction
      const enriched = await Promise.all((data || []).map(async (tx) => {
        // Prefer base64 array stored on transaction
        if (Array.isArray(tx.pickup_photos_base64) && tx.pickup_photos_base64.length > 0) {
          const photoUrls = tx.pickup_photos_base64.map((p) => ({ url: `data:${p.mimeType || 'image/jpeg'};base64,${p.base64}`, name: p.name || 'photo' }));
          return { ...tx, photoUrls };
        }
        // Fall back to Storage bucket listing
        const folder = `${tx.id}`;
        try {
          const listRes = await supabase.storage.from('orders').list(folder);
          const files = listRes?.data || [];
          const signedUrls = [];
          for (const file of files) {
            const path = `${folder}/${file.name}`;
            const { data: signed } = await supabase.storage.from('orders').createSignedUrl(path, 60 * 60);
            if (signed?.signedUrl) {
              signedUrls.push({ url: signed.signedUrl, name: file.name });
            }
          }
          return { ...tx, photoUrls: signedUrls };
        } catch (e) {
          // If bucket missing or not accessible, continue without photos
          return { ...tx, photoUrls: [] };
        }
      }));

      setOrders(enriched);
    } catch (e) {
      console.error('Error loading orders:', e);
      Alert.alert('Error', 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const updateStatus = async (order, newStatus) => {
    try {
      // Only owners can update status per RLS
      if (order.owner_id !== user.id) {
        Alert.alert('Not allowed', 'Only the owner can update order status.');
        return;
      }
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', order.id);
      if (error) throw error;
      Alert.alert('Updated', `Order marked as ${newStatus}.`);
      onRefresh();
    } catch (e) {
      console.error('Error updating status:', e);
      Alert.alert('Error', 'Could not update status.');
    }
  };

  const renderOrder = ({ item: tx }) => {
    const isOwner = tx.owner_id === user?.id;
    const otherUser = isOwner ? tx.borrower : tx.owner;
    const photoPreview = tx.photoUrls?.[0]?.url;

    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OrderDetail', { transaction: tx })}>
        <Image
          source={{ uri: tx.items?.photo_base64 ? `data:image/jpeg;base64,${tx.items.photo_base64}` : 'https://via.placeholder.com/80x80?text=Item' }}
          style={styles.itemImage}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{tx.items?.title || 'Item'}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {isOwner ? 'Borrower' : 'Owner'}: {otherUser?.name || 'Unknown'}
          </Text>
          <View style={styles.row}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tx.status) }]}>
              <Text style={styles.statusText}>{tx.status}</Text>
            </View>
            {tx.items?.type === 'rent' && tx.items?.price ? (
              <Text style={styles.price}>₹{tx.items.price}/day</Text>
            ) : null}
          </View>
          {tx.photoUrls && tx.photoUrls.length > 0 ? (
            <View style={styles.photosRow}>
              {tx.photoUrls.slice(0, 3).map((p) => (
                <Image key={p.name} source={{ uri: p.url }} style={styles.photoThumb} />
              ))}
              {tx.photoUrls.length > 3 ? (
                <View style={styles.moreBadge}><Text style={styles.moreText}>+{tx.photoUrls.length - 3}</Text></View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.noPhotos}>No pickup photos</Text>
          )}
        </View>

        {isOwner ? (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => updateStatus(tx, 'accepted')}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => updateStatus(tx, 'completed')}>
              <Ionicons name="flag" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger }]} onPress={() => updateStatus(tx, 'rejected')}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionsDisabled}>
            <Ionicons name="information-circle" size={18} color={COLORS.textSecondary} />
            <Text style={styles.actionsHint}>Owner controls status</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading orders…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Orders</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(tx) => tx.id}
        renderItem={renderOrder}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="list" size={48} color={COLORS.textSecondary} /><Text style={styles.emptyText}>No orders yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: COLORS.textSecondary },
  card: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, 
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  itemImage: { width: 72, height: 72, borderRadius: 10, marginRight: 12, backgroundColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  price: { marginLeft: 8, fontSize: 12, color: COLORS.textSecondary },
  photosRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6, flexWrap: 'wrap' },
  photoThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#eee' },
  moreBadge: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: COLORS.textSecondary, fontSize: 12 },
  noPhotos: { marginTop: 8, fontSize: 12, color: COLORS.textSecondary },
  actions: { marginLeft: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionsDisabled: { marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  actionsHint: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 64 },
  emptyText: { marginTop: 8, color: COLORS.textSecondary }
});

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return '#f0ad4e';
    case 'accepted':
      return '#5cb85c';
    case 'completed':
      return '#5bc0de';
    case 'rejected':
      return '#d9534f';
    default:
      return COLORS.textSecondary;
  }
};