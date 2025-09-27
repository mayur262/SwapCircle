import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { COLORS, ITEM_TYPES, TRANSACTION_STATUS, ECO_IMPACT } from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function TransactionDetailScreen({ route, navigation }) {
  const { item } = route.params;
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [userItems, setUserItems] = useState([]);
  const [selectedSwapItem, setSelectedSwapItem] = useState(null);
  const [message, setMessage] = useState('');
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    fetchOwnerDetails();
    if (item.type === 'swap') {
      fetchUserItems();
    }
  }, []);

  const fetchOwnerDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', item.user_id)
        .single();

      if (!error && data) {
        setOwner(data);
      }
    } catch (error) {
      console.error('Error fetching owner details:', error);
    }
  };

  const fetchUserItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .neq('id', item.id);

      if (!error) {
        setUserItems(data || []);
      }
    } catch (error) {
      console.error('Error fetching user items:', error);
    }
  };

  const handleTransaction = async (transactionType) => {
    if (!user) {
      Alert.alert('Error', 'Please login to continue');
      return;
    }

    if (user.id === item.user_id) {
      Alert.alert('Error', 'You cannot request your own item');
      return;
    }

    setLoading(true);

    try {
      let transactionData = {
        item_id: item.id,
        owner_id: item.user_id,
        borrower_id: user.id,
        type: transactionType,
        status: 'pending',
        eco_points_awarded: 0,
        created_at: new Date().toISOString()
      };

      // For swap transactions, include the swap item
      if (transactionType === 'swap' && selectedSwapItem) {
        transactionData.swap_item_id = selectedSwapItem.id;
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;

      // For donate/recycle, auto-complete the transaction
      if (transactionType === 'donate' || transactionType === 'recycle') {
        await completeTransaction(data.id);
      } else {
        Alert.alert(
          'Request Sent!',
          `Your ${transactionType} request has been sent to the owner.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setLoading(false);
      setShowSwapModal(false);
    }
  };

  const completeTransaction = async (transactionId) => {
    try {
      // Calculate eco points
      const ecoPoints = ECO_IMPACT.POINTS_PER_TRANSACTION;

      // Update transaction status
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          eco_points_awarded: ecoPoints,
          completed_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (transactionError) throw transactionError;

      // Update both users' eco points
      const { error: borrowerError } = await supabase
        .from('users')
        .update({
          eco_points: (userProfile?.eco_points || 0) + ecoPoints
        })
        .eq('id', user.id);

      const { error: ownerError } = await supabase
        .from('users')
        .update({
          eco_points: (owner?.eco_points || 0) + ecoPoints
        })
        .eq('id', item.user_id);

      if (borrowerError || ownerError) {
        console.error('Error updating eco points:', borrowerError || ownerError);
      }

      Alert.alert(
        'Success!',
        `Transaction completed! You both earned ${ecoPoints} eco points.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error completing transaction:', error);
      Alert.alert('Error', 'Failed to complete transaction.');
    }
  };

  const handleSwapRequest = () => {
    if (!selectedSwapItem) {
      Alert.alert('Error', 'Please select an item to swap');
      return;
    }
    handleTransaction('swap');
  };

  const handleRentRequest = () => {
    Alert.alert(
      'Rent Request',
      `Send rent request for ₹${item.price}/day?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Request', onPress: () => handleTransaction('rent') }
      ]
    );
  };

  const handleDonateRequest = () => {
    Alert.alert(
      'Confirm Donation',
      'Are you sure you want to claim this donated item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => handleTransaction('donate') }
      ]
    );
  };

  const handleRecycleRequest = () => {
    Alert.alert(
      'Confirm Recycle',
      'Are you sure you want to claim this item for recycling?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => handleTransaction('recycle') }
      ]
    );
  };

  const renderSwapItem = ({ item: swapItem }) => (
    <TouchableOpacity
      style={[
        styles.swapItemCard,
        selectedSwapItem?.id === swapItem.id && styles.selectedSwapItem
      ]}
      onPress={() => setSelectedSwapItem(swapItem)}
    >
      <Image source={{ uri: swapItem.photo_url }} style={styles.swapItemImage} />
      <View style={styles.swapItemInfo}>
        <Text style={styles.swapItemTitle} numberOfLines={2}>
          {swapItem.title}
        </Text>
        <Text style={styles.swapItemCategory}>
          {swapItem.category}
        </Text>
      </View>
      {selectedSwapItem?.id === swapItem.id && (
        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  const getActionButton = () => {
    switch (item.type) {
      case 'swap':
        return (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
            onPress={() => setShowSwapModal(true)}
            disabled={loading}
          >
            <Ionicons name="swap-horizontal" size={20} color="white" />
            <Text style={styles.actionButtonText}>Propose Swap</Text>
          </TouchableOpacity>
        );
      case 'rent':
        return (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
            onPress={handleRentRequest}
            disabled={loading}
          >
            <Ionicons name="calendar" size={20} color="white" />
            <Text style={styles.actionButtonText}>Rent for ₹{item.price}/day</Text>
          </TouchableOpacity>
        );
      case 'donate':
        return (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.success }]}
            onPress={handleDonateRequest}
            disabled={loading}
          >
            <Ionicons name="heart" size={20} color="white" />
            <Text style={styles.actionButtonText}>Claim Donation</Text>
          </TouchableOpacity>
        );
      case 'recycle':
        return (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.warning }]}
            onPress={handleRecycleRequest}
            disabled={loading}
          >
            <Ionicons name="leaf" size={20} color="white" />
            <Text style={styles.actionButtonText}>Claim for Recycling</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'swap': return COLORS.primary;
      case 'rent': return COLORS.secondary;
      case 'donate': return COLORS.success;
      case 'recycle': return COLORS.warning;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.photo_url }} style={styles.itemImage} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={[styles.typeTag, { backgroundColor: getTypeColor(item.type) }]}>
            <Text style={styles.typeTagText}>{item.type.toUpperCase()}</Text>
          </View>
        </View>

        {/* Item Details */}
        <View style={styles.contentContainer}>
          <View style={styles.titleSection}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.price > 0 && (
              <Text style={styles.itemPrice}>₹{item.price}/day</Text>
            )}
          </View>

          <Text style={styles.itemDescription}>{item.description}</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="pricetag" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{item.category}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Owner Info */}
          {owner && (
            <View style={styles.ownerSection}>
              <Text style={styles.sectionTitle}>Owner</Text>
              <View style={styles.ownerCard}>
                <Image
                  source={{
                    uri: owner.photo_url || 'https://via.placeholder.com/50x50?text=U'
                  }}
                  style={styles.ownerAvatar}
                />
                <View style={styles.ownerInfo}>
                  <View style={styles.ownerNameContainer}>
                    <Text style={styles.ownerName}>{owner.name}</Text>
                    {owner.verified && (
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    )}
                  </View>
                  <Text style={styles.ownerPoints}>
                    {owner.eco_points} eco points
                  </Text>
                </View>
                <TouchableOpacity style={styles.messageButton}>
                  <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Environmental Impact */}
          <View style={styles.impactSection}>
            <Text style={styles.sectionTitle}>Environmental Impact</Text>
            <View style={styles.impactCard}>
              <View style={styles.impactItem}>
                <Ionicons name="cash" size={24} color={COLORS.success} />
                <View style={styles.impactText}>
                  <Text style={styles.impactValue}>₹{ECO_IMPACT.MONEY_SAVED_PER_TRANSACTION}</Text>
                  <Text style={styles.impactLabel}>Money Saved</Text>
                </View>
              </View>
              <View style={styles.impactItem}>
                <Ionicons name="leaf" size={24} color={COLORS.success} />
                <View style={styles.impactText}>
                  <Text style={styles.impactValue}>{ECO_IMPACT.CO2_SAVED_PER_TRANSACTION}kg</Text>
                  <Text style={styles.impactLabel}>CO₂ Reduced</Text>
                </View>
              </View>
              <View style={styles.impactItem}>
                <Ionicons name="star" size={24} color={COLORS.warning} />
                <View style={styles.impactText}>
                  <Text style={styles.impactValue}>{ECO_IMPACT.POINTS_PER_TRANSACTION}</Text>
                  <Text style={styles.impactLabel}>Eco Points</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      {user?.id !== item.user_id && (
        <View style={styles.actionContainer}>
          {getActionButton()}
        </View>
      )}

      {/* Swap Modal */}
      <Modal
        visible={showSwapModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSwapModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Item to Swap</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={userItems}
            renderItem={renderSwapItem}
            keyExtractor={(item) => item.id}
            style={styles.swapItemsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cube" size={60} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No items to swap</Text>
                <Text style={styles.emptySubtext}>
                  Add some items to your profile first
                </Text>
              </View>
            }
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: selectedSwapItem ? COLORS.primary : COLORS.textSecondary }
              ]}
              onPress={handleSwapRequest}
              disabled={!selectedSwapItem || loading}
            >
              <Text style={styles.modalButtonText}>Send Swap Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeTag: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  typeTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 20,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  itemDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsGrid: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  ownerSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  ownerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  ownerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ownerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 5,
  },
  ownerPoints: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  impactSection: {
    marginBottom: 20,
  },
  impactCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  impactText: {
    marginLeft: 12,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  impactLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  swapItemsList: {
    flex: 1,
    padding: 20,
  },
  swapItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSwapItem: {
    borderColor: COLORS.primary,
  },
  swapItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  swapItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  swapItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  swapItemCategory: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalActions: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
});