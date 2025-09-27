import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function PickupPhotosScreen({ route, navigation }) {
  const { item, transaction } = route?.params || {};
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [photos, setPhotos] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      setPermissionsGranted(status === 'granted' || cameraStatus === 'granted');
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setPhotos(asset);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not select image. Please try again.');
    }
  };

  const hasPhoto = !!photos;

  const convertAssetToBase64 = async (asset) => {
    if (!asset) return null;
    if (asset.base64) return asset.base64;
    try {
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result || '';
          const parts = String(dataUrl).split(',');
          resolve(parts[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return base64;
    } catch (err) {
      console.warn('Failed to convert image to base64', err);
      return null;
    }
  };

  const buildPickupBase64 = async () => {
    const asset = photos;
    const b64 = await convertAssetToBase64(asset);
    if (b64) {
      return [{ name: 'pickup', base64: b64, mimeType: asset?.mimeType || 'image/jpeg' }];
    }
    return [];
  };

  const submitPickup = async () => {
  if (!hasPhoto) {
    Alert.alert('Incomplete', 'Please upload a pickup photo.');
    return;
  }

  try {
    setSubmitting(true);

    if (!transaction?.id) {
      throw new Error('Missing transaction ID');
    }

    // 1️⃣ Convert photo to base64 array
    const pickupArray = await buildPickupBase64();

    // 2️⃣ Update the transaction table with the photo
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .update({ pickup_photos_base64: pickupArray })
      .eq('id', transaction.id)
      .select();

    if (transactionError) {
      console.warn('Transaction update failed:', transactionError.message);
      Alert.alert('Upload Failed', 'Could not save pickup photo to transaction.');
      return;
    }

    // 3️⃣ Determine receiver for message
    const receiverId =
      transaction.borrower_id === user?.id
        ? transaction.owner_id
        : transaction.borrower_id;

    // 4️⃣ Insert a message with the photo
    const content = { type: 'pickup_photo', photos: pickupArray };
    const { error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          transaction_id: transaction.id,
          sender_id: user?.id,
          receiver_id: receiverId,
          content: JSON.stringify(content),
        },
      ]);

    if (messageError) {
      console.warn('Message insert failed:', messageError.message);
      Alert.alert('Upload Partially Successful', 'Photo saved, but message could not be sent.');
    }

    Alert.alert('Submitted', 'Pickup photo submitted successfully.');

    // 5️⃣ Navigate to Orders tab
    navigation.navigate('MainTabs', { screen: 'Orders' });
  } catch (e) {
    console.error('Upload failed:', e);
    Alert.alert('Upload Failed', 'Could not save photo. Please try again.');
  } finally {
    setSubmitting(false);
  }
};


  const PhotoSlot = ({ label }) => {
    const photo = photos;
    return (
      <View style={styles.slot}>
        <Text style={styles.slotLabel}>{label}</Text>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera" size={28} color={COLORS.textSecondary} />
            <Text style={styles.placeholderText}>No photo</Text>
          </View>
        )}
        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
          <Ionicons name="cloud-upload" size={18} color="#fff" />
          <Text style={styles.uploadBtnText}>Select Photo</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pickup Photo</Text>
      <Text style={styles.subtitle}>Please upload a pickup photo</Text>
 
        <View style={styles.grid}>
          <PhotoSlot label="Photo" />
        </View>
 
        <TouchableOpacity
          style={[styles.submitBtn, (!hasPhoto || submitting) && { opacity: 0.6 }]}
          onPress={submitPickup}
          disabled={!hasPhoto || submitting}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Pickup'}</Text>
        </TouchableOpacity>

      {item ? (
        <View style={styles.itemSummary}>
          <Image
            source={{
              uri: item.photo_base64
                ? `data:image/jpeg;base64,${item.photo_base64}`
                : 'https://via.placeholder.com/80x80?text=Item'
            }}
            style={styles.itemImage}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            {item.price ? <Text style={styles.itemPrice}>₹{item.price}/day</Text> : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  subtitle: { marginTop: 4, color: COLORS.textSecondary },
  grid: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  slot: { width: '48%', marginBottom: 16 },
  slotLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: COLORS.text },
  imagePreview: { width: '100%', height: 140, borderRadius: 8, backgroundColor: '#eee' },
  placeholder: { width: '100%', height: 140, borderRadius: 8, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: COLORS.textSecondary, marginTop: 6 },
  uploadBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  uploadBtnText: { color: '#fff', fontWeight: '600' },
  submitBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.success, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, alignSelf: 'flex-start' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  itemSummary: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  itemImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  itemPrice: { fontSize: 13, color: COLORS.textSecondary }
});