import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function OrderDetailScreen({ route, navigation }) {
  const { transaction } = route.params || {};
  const { user } = useAuth();
  const [tx, setTx] = useState(transaction);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
  const load = async () => {
    try {
      if (!tx) return;

      // 🔄 Refresh the transaction with related data
      const { data: refreshed, error } = await supabase
        .from('transactions')
        .select(`
          *,
          items:items(id, title, photo_base64, type, price, location),
          owner:users!transactions_owner_id_fkey(id, name, photo_url),
          borrower:users!transactions_borrower_id_fkey(id, name, photo_url)
        `)
        .eq('id', tx.id)
        .single();

      if (!error && refreshed) {
        setTx(refreshed);
      }

      // 🔎 Load latest messages for this transaction
      const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('id, content, created_at')
        .eq('transaction_id', tx.id)
        .order('created_at', { ascending: false })
        .limit(20); // increase a bit to catch more

      let messagePhotos = [];
      if (!msgErr && Array.isArray(msgs)) {
        for (const m of msgs) {
          try {
            const c = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
            if (c?.type === 'pickup_photo' && Array.isArray(c.photos) && c.photos.length) {
              messagePhotos.push(
                ...c.photos.map((p) => ({
                  url: `data:${p.mimeType || 'image/jpeg'};base64,${p.base64}`,
                  name: p.name || 'photo',
                }))
              );
            }
          } catch {}
        }
      }

      if (messagePhotos.length) {
        setPhotos(messagePhotos);
        setLoading(false);
        return;
      }

      // 🗄️ fallback: transaction column
      const base64List = refreshed?.pickup_photos_base64 || tx?.pickup_photos_base64;
      if (Array.isArray(base64List) && base64List.length > 0) {
        const prepared = base64List.map((p) => ({
          url: `data:${p.mimeType || 'image/jpeg'};base64,${p.base64}`,
          name: p.name || 'photo',
        }));
        setPhotos(prepared);
      } else {
        // 📦 fallback: storage
        const folder = `${refreshed?.id || tx.id}`;
        const listRes = await supabase.storage.from('orders').list(folder);
        const files = listRes?.data || [];
        const signed = [];
        for (const file of files) {
          const path = `${folder}/${file.name}`;
          const { data: s } = await supabase.storage.from('orders').createSignedUrl(path, 60 * 60);
          if (s?.signedUrl) signed.push({ url: s.signedUrl, name: file.name });
        }
        setPhotos(signed);
      }
    } catch (e) {
      console.error('Error loading order detail:', e);
    } finally {
      setLoading(false);
    }
  };

  load();
}, []);


  const isOwner = tx?.owner_id === user?.id;
  const otherUser = isOwner ? tx?.borrower : tx?.owner;

  const updateStatus = async (newStatus) => {
    try {
      if (!isOwner) {
        Alert.alert('Not allowed', 'Only the owner can update order status.');
        return;
      }
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', tx.id);
      if (error) throw error;
      Alert.alert('Updated', `Order marked as ${newStatus}.`);
      navigation.goBack();
    } catch (e) {
      console.error('Error updating status:', e);
      Alert.alert('Error', 'Could not update status.');
    }
  };

  const openInMaps = () => {
    const locText = tx?.items?.location;
    if (!locText) {
      Alert.alert('No location', 'No pickup location provided for this order.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locText)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open Google Maps'));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading order…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <View style={styles.summaryRow}>
        <Image
          source={{ uri: tx.items?.photo_base64 ? `data:image/jpeg;base64,${tx.items.photo_base64}` : 'https://via.placeholder.com/80x80?text=Item' }}
          style={styles.itemImage}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{tx.items?.title}</Text>
          <Text style={styles.subtitle}>
            {isOwner ? 'Borrower' : 'Owner'}: {otherUser?.name || 'Unknown'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tx.status) }]}> 
            <Text style={styles.statusText}>{tx.status}</Text>
          </View>
        </View>
      </View>

      {/* Pickup Location */}
      <Text style={styles.sectionTitle}>Pickup Location</Text>
      {tx.items?.location ? (
        <TouchableOpacity style={styles.locationRow} onPress={openInMaps}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
          <Text style={styles.locationText} numberOfLines={2}>{tx.items.location}</Text>
          <Text style={styles.viewOnMap}>Open in Google Maps</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.noPhotos}>No pickup location provided</Text>
      )}

      <Text style={styles.sectionTitle}>Pickup Photos</Text>
      {photos?.length ? (
        <View style={styles.photosGrid}>
          {photos.map((p) => (
            <TouchableOpacity key={p.name} onPress={() => setPreviewUrl(p.url)}>
              <Image source={{ uri: p.url }} style={styles.photo} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.noPhotos}>No pickup photos uploaded</Text>
      )}

      {isOwner ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => updateStatus('accepted')}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.actionText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => updateStatus('completed')}>
            <Ionicons name="flag" size={20} color="#fff" />
            <Text style={styles.actionText}>Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger }]} onPress={() => updateStatus('rejected')}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Image Preview Modal */}
      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <View style={styles.modalBackdrop}>
          <Image source={{ uri: previewUrl || '' }} style={styles.modalImage} />
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewUrl(null)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: COLORS.textSecondary },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  itemImage: { width: 72, height: 72, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  sectionTitle: { paddingHorizontal: 16, marginTop: 12, fontSize: 16, fontWeight: '600', color: COLORS.text },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  photo: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' },
  noPhotos: { paddingHorizontal: 16, paddingVertical: 12, color: COLORS.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  locationText: { flex: 1, fontSize: 14, color: COLORS.text },
  viewOnMap: { color: COLORS.primary, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  actionText: { color: '#fff', fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '90%', height: '70%', resizeMode: 'contain' },
  modalClose: { position: 'absolute', top: 24, right: 24 }
});