import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ITEM_TYPES } from '../constants';
import { supabase } from '../lib/supabase'; // Import supabase

export default function ItemDetailScreen({ route, navigation }) {
  const item = route?.params?.item;
  const [currentUser, setCurrentUser] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paying, setPaying] = useState(false);
  // New: Applicants modal state
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  // New: Borrow/Return dates controlled by the borrower
  const [borrowStart, setBorrowStart] = useState('');
  const [borrowEnd, setBorrowEnd] = useState('');
  const [dateError, setDateError] = useState('');
  // New: Donate modal for free borrow requests
  const [showDonateModal, setShowDonateModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    fetchUser();
  }, []);

  const parseDate = (str) => {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const isValidDateRange = () => {
    const s = parseDate(borrowStart);
    const e = parseDate(borrowEnd);
    if (!s || !e) {
      setDateError('Please enter both start and end dates (YYYY-MM-DD).');
      return false;
    }
    if (s > e) {
      setDateError('Return date must be after start date.');
      return false;
    }
    setDateError('');
    return true;
  };

  const handleRequestSwap = async () => {
    if (!currentUser || !item) return;

    // Prevent user from swapping with themselves
    if (currentUser.id === item.user_id) {
      alert("You cannot swap for your own item.");
      return;
    }

    // Create a new transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          item_id: item.id,
          requester_id: currentUser.id,
          owner_id: item.user_id,
          status: 'pending',
        },
      ])
      .select();

    if (error) {
      alert('Error requesting swap. Please try again.');
      console.error('Error creating transaction:', error);
    } else {
      alert('Swap requested successfully!');
      navigation.navigate('Swaps');
    }
  };

  const handleRentNow = () => {
    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to proceed with rental.');
      return;
    }
    setShowPaymentModal(true);
  };

  const processFakePayment = async () => {
    try {
      if (!isValidDateRange()) return;
      setPaying(true);
      // Simulate payment processing delay
      await new Promise((res) => setTimeout(res, 1200));

      // Best-effort: create a rent transaction to represent escrowed payment
      let createdTx = null;
      try {
        const s = parseDate(borrowStart);
        const e = parseDate(borrowEnd);
        const { data, error } = await supabase
          .from('transactions')
          .insert([
            {
              item_id: item.id,
              owner_id: item.user_id,
              borrower_id: currentUser.id,
              type: 'rent',
              status: 'pending', // Considered 'in escrow' until owner confirms
              borrow_start_date: s ? s.toISOString() : null,
              borrow_end_date: e ? e.toISOString() : null,
            },
          ])
          .select()
          .single();
        if (!error) createdTx = data;
      } catch (e) {
        console.warn('Unable to create rent transaction, continuing with flow:', e?.message || e);
      }

      setShowPaymentModal(false);
      Alert.alert('Payment Successful', 'Your payment is held safely in escrow.');

      // Navigate to pickup photos screen to capture 4 sides
      navigation.navigate('PickupPhotos', { item, transaction: createdTx });
    } catch (e) {
      Alert.alert('Payment Failed', 'Something went wrong while processing payment. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  // New: Owner can view applicants
  const isOwner = !!currentUser && currentUser.id === item?.user_id;

  const openApplicantsModal = async () => {
    setShowApplicantsModal(true);
    setLoadingApplicants(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, status, created_at,
          borrower:users!transactions_borrower_id_fkey (id, name, photo_url)
        `)
        .eq('item_id', item.id)
        .eq('type', 'rent')
        .order('created_at', { ascending: false });

      if (!error) {
        setApplicants(data || []);
      }
    } catch (err) {
      console.error('Error fetching applicants:', err);
      Alert.alert('Error', 'Failed to load applicants. Please try again.');
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleBuyNow = async () => {
    if (!currentUser || !item) return;
  
    // Prevent user from buying their own item
    if (currentUser.id === item.user_id) {
      Alert.alert('Not allowed', 'You cannot buy your own item.');
      return;
    }
  
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([
          {
            item_id: item.id,
            owner_id: item.user_id,
            borrower_id: currentUser.id,
            type: 'recycle',
            status: 'pending',
          },
        ])
        .select();
  
      if (error) {
        console.error('Error creating recycle transaction:', error);
        Alert.alert('Error', 'Could not start purchase. Please try again.');
        return;
      }
  
      const createdTx = Array.isArray(data) && data.length ? data[0] : null;
      if (createdTx) {
        // Navigate to pickup photos to confirm the handover, similar to rent/donate flows
        navigation.navigate('PickupPhotos', { item, transaction: createdTx });
      } else {
        Alert.alert('Notice', 'Purchase requested, but no transaction was returned.');
      }
    } catch (e) {
      console.error('Unexpected error creating recycle transaction:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };
  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>No item selected</Text>
        <Text style={styles.emptySubtext}>Please go back and select an item from the feed.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color="white" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itemType = ITEM_TYPES.find(t => t.id === item.type);

  // Derive borrow/return date strings if present
  const borrowStartStr = item?.borrow_start_date ? new Date(item.borrow_start_date).toLocaleDateString() : null;
  const borrowEndStr = item?.borrow_end_date ? new Date(item.borrow_end_date).toLocaleDateString() : null;

  const canPay = !!parseDate(borrowStart) && !!parseDate(borrowEnd) && parseDate(borrowStart) <= parseDate(borrowEnd);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image
  source={{
    uri: item.photo_base64
      ? `data:image/jpeg;base64,${item.photo_base64}`
      : 'https://via.placeholder.com/600x400?text=No+Image'
  }}
  style={styles.heroImage}
/>


      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.price ? (
              <Text style={styles.price}>₹{item.price}</Text>
            ) : null}
          </View>
          {!!itemType && (
            <View style={[styles.typeTag, { backgroundColor: itemType.color }] }>
              <Ionicons name={itemType.icon} size={14} color="white" />
              <Text style={styles.typeTagText}>{itemType.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.ownerBox}>
          <Image
            source={{ uri: item.users?.photo_url || 'https://via.placeholder.com/40x40?text=U' }}
            style={styles.ownerAvatar}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.ownerRow}>
              <Text style={styles.ownerName}>{item.users?.name || 'Unknown'}</Text>
              {item.users?.verified && (
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
              )}
            </View>
            <Text style={styles.ownerSubtitle}>Community Member</Text>
          </View>
          {item.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category}</Text>
            </View>
          )}
        </View>

        {item.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{item.description}</Text>
            {/* Contextual messaging for type */}
            {item.type === 'recycle' && (
              <View style={styles.infoRow}>
                <Ionicons name="leaf" size={16} color={COLORS.primary} />
                <Text style={styles.infoText}>This listing is about giving your old item a second life — let someone reuse it.</Text>
              </View>
            )}
            {item.type === 'donate' && (
              <View style={styles.infoRow}>
                <Ionicons name="gift" size={16} color={COLORS.primary} />
                <Text style={styles.infoText}>Free to use — please return it by the agreed date.</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Borrow & Return Dates */}
        {(item.type === 'rent' || item.type === 'donate') && (borrowStartStr || borrowEndStr) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.type === 'donate' ? 'Use & Return Window' : 'Borrow & Return'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar" size={18} color={COLORS.primary} />
              <Text style={styles.description}>
                {borrowStartStr ? borrowStartStr : '—'} to {borrowEndStr ? borrowEndStr : '—'}
              </Text>
            </View>
          </View>
        ) : null}

        {(item.location || (item.latitude && item.longitude)) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner's Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <Text style={styles.locationText} numberOfLines={2}>
                {item.location || `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}`}
              </Text>
              {(item.latitude && item.longitude) ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('MapView', {
                    location: { coords: { latitude: item.latitude, longitude: item.longitude } },
                    items: [],
                    locationAddress: item.location || undefined,
                  })}
                >
                  <Text style={styles.viewOnMap}>View on map</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
        <View style={styles.actionsRow}>
          {item.type === 'rent' ? (
            isOwner ? (
              <TouchableOpacity style={styles.primaryButton} onPress={openApplicantsModal}>
                <Ionicons name="people" size={18} color="white" />
                <Text style={styles.primaryButtonText}>View Applicants</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={handleRentNow}>
                <Ionicons name="card" size={18} color="white" />
                <Text style={styles.primaryButtonText}>Rent Now</Text>
              </TouchableOpacity>
            )
          ) : item.type === 'donate' ? (
            !isOwner && (
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowDonateModal(true)}>
                <Ionicons name="calendar" size={18} color="white" />
                <Text style={styles.primaryButtonText}>Borrow for Free</Text>
              </TouchableOpacity>
            )
          ) : item.type === 'recycle' ? (
            !isOwner && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleBuyNow}>
                <Ionicons name="card" size={18} color="white" />
                <Text style={styles.primaryButtonText}>Buy Now</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleRequestSwap}>
              <Ionicons name="swap-horizontal" size={18} color="white" />
              <Text style={styles.primaryButtonText}>Request Swap</Text>
            </TouchableOpacity>
          )}

          {!isOwner && (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Chat', { otherUser: item.users, item: item })}>
              <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.text} />
              <Text style={styles.secondaryButtonText}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Fake Payment Modal for Escrow */}
      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => !paying && setShowPaymentModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="lock-closed" size={28} color={COLORS.primary} />
              <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>Secure Escrow Payment</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' }}>
                We will hold your payment safely in escrow until pickup is verified.
              </Text>
            </View>

            {/* Date inputs before payment */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>Borrow & Return Dates</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f7f7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    placeholder="Start date (YYYY-MM-DD)"
                    value={borrowStart}
                    onChangeText={setBorrowStart}
                    autoCapitalize="none"
                    style={{ marginLeft: 8, flex: 1 }}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f7f7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    placeholder="Return date (YYYY-MM-DD)"
                    value={borrowEnd}
                    onChangeText={setBorrowEnd}
                    autoCapitalize="none"
                    style={{ marginLeft: 8, flex: 1 }}
                  />
                </View>
                {!!dateError && <Text style={{ color: 'tomato', fontSize: 12 }}>{dateError}</Text>}
              </View>
            </View>

            {item.price ? (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Amount</Text>
                <Text style={styles.paymentValue}>₹{item.price}/day</Text>
              </View>
            ) : null}

            <TouchableOpacity style={[styles.payButton, (paying || !canPay) && { opacity: 0.7 }]} onPress={processFakePayment} disabled={paying || !canPay}>
              {paying ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.payButtonText}>Processing…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.payButtonText}>Pay Now</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} disabled={paying} onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Donate Request Modal (Free) */}
      <Modal visible={showDonateModal} transparent animationType="slide" onRequestClose={() => setShowDonateModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Request to Borrow</Text>
              <TouchableOpacity onPress={() => setShowDonateModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 8 }}>
              This item is free to borrow. Please choose when you'll use it and when you'll return it.
            </Text>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>Use & Return Dates</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f7f7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    placeholder="Start date (YYYY-MM-DD)"
                    value={borrowStart}
                    onChangeText={setBorrowStart}
                    autoCapitalize="none"
                    style={{ marginLeft: 8, flex: 1 }}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f7f7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    placeholder="Return date (YYYY-MM-DD)"
                    value={borrowEnd}
                    onChangeText={setBorrowEnd}
                    autoCapitalize="none"
                    style={{ marginLeft: 8, flex: 1 }}
                  />
                </View>
                {!!dateError && <Text style={{ color: 'tomato', fontSize: 12 }}>{dateError}</Text>}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.payButton, (!canPay) && { opacity: 0.7 }]}
              onPress={async () => {
                if (!isValidDateRange()) return;
                try {
                  const s = parseDate(borrowStart);
                  const e = parseDate(borrowEnd);
                  const { data, error } = await supabase
                    .from('transactions')
                    .insert([
                      {
                        item_id: item.id,
                        owner_id: item.user_id,
                        borrower_id: currentUser?.id,
                        type: 'donate',
                        status: 'pending',
                        borrow_start_date: s ? s.toISOString() : null,
                        borrow_end_date: e ? e.toISOString() : null,
                      },
                    ])
                    .select()
                    .single();
                  if (error) throw error;
                  setShowDonateModal(false);
                  // Go directly to pickup photos flow with created transaction
                  navigation.navigate('PickupPhotos', { item, transaction: data });
                } catch (err) {
                  console.error('Donate request error:', err);
                  Alert.alert('Error', 'Could not send request. Please try again.');
                }
              }}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.payButtonText}>Continue to Pickup</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDonateModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Applicants Modal for Owners */}
      <Modal visible={showApplicantsModal} transparent animationType="slide" onRequestClose={() => setShowApplicantsModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Applicants</Text>
              <TouchableOpacity onPress={() => setShowApplicantsModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12 }}>
              {loadingApplicants ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : applicants.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Ionicons name="people" size={36} color={COLORS.textSecondary} />
                  <Text style={{ marginTop: 8, color: COLORS.textSecondary }}>No applicants yet</Text>
                </View>
              ) : (
                <View>
                  {applicants.map((a) => (
                    <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                      <Image
                        source={{ uri: a.borrower?.photo_url || 'https://via.placeholder.com/40x40?text=U' }}
                        style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: COLORS.text }}>{a.borrower?.name || 'Unknown User'}</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Status: {a.status}</Text>
                      </View>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 }}
                        onPress={() => navigation.navigate('Chat', { otherUser: a.borrower, item })}
                      >
                        <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.text} />
                        <Text style={{ marginLeft: 6, color: COLORS.text, fontWeight: '600' }}>Chat</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#eee',
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  price: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typeTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerBox: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerAvatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#ddd',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  ownerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 999,
  },
  categoryTagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  locationRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  viewOnMap: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 999,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    marginVertical: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  payButton: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 999,
  },
  payButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  cancelButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
  },
});