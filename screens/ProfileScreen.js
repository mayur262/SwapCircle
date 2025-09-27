import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { COLORS, ECO_IMPACT } from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const { user, userProfile, signOut, updateProfile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch user transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          *,
          items (
            id,
            title,
            photo_url,
            type
          ),
          owner:users!transactions_owner_id_fkey (
            id,
            name,
            photo_url
          ),
          borrower:users!transactions_borrower_id_fkey (
            id,
            name,
            photo_url
          )
        `)
        .or(`owner_id.eq.${user.id},borrower_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!transactionError) {
        setTransactions(transactionData || []);
      }

      // Fetch user items
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!itemError) {
        setUserItems(itemData || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleEditName = () => {
    setNewName(userProfile?.name || '');
    setShowEditNameModal(true);
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    setIsUpdatingName(true);
    try {
      // Use the updateProfile function from AuthContext to update both database and local state
      const { error } = await updateProfile({ name: newName.trim() });

      if (error) {
        Alert.alert('Error', 'Failed to update name');
        return;
      }

      Alert.alert('Success', 'Name updated successfully');
      setShowEditNameModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const calculateEcoStats = () => {
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const totalSavings = completedTransactions.length * ECO_IMPACT.MONEY_SAVED_PER_TRANSACTION;
    const totalCO2Saved = completedTransactions.length * ECO_IMPACT.CO2_SAVED_PER_TRANSACTION;
    
    return {
      totalTransactions: completedTransactions.length,
      totalSavings,
      totalCO2Saved
    };
  };

  const renderTransaction = ({ item }) => {
    const isOwner = item.owner_id === user.id;
    const otherUser = isOwner ? item.borrower : item.owner;
    
    return (
      <View style={styles.transactionCard}>
        <Image 
          source={{ 
            uri: item.items?.photo_url || 'https://via.placeholder.com/60x60?text=Item' 
          }} 
          style={styles.transactionImage} 
        />
        
        <View style={styles.transactionContent}>
          <Text style={styles.transactionTitle}>{item.items?.title}</Text>
          <Text style={styles.transactionUser}>
            {isOwner ? 'Borrowed by' : 'From'} {otherUser?.name}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.transactionStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) }
          ]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          {item.eco_points_awarded > 0 && (
            <Text style={styles.ecoPoints}>+{item.eco_points_awarded} pts</Text>
          )}
        </View>
      </View>
    );
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => navigation.navigate('ItemDetail', { item })}
    >
      <Image 
        source={{ 
          uri: item.photo_url || 'https://via.placeholder.com/100x100?text=Item' 
        }} 
        style={styles.itemImage} 
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemType}>{item.type}</Text>
        {item.price && (
          <Text style={styles.itemPrice}>₹{item.price}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'accepted': return COLORS.secondary;
      case 'pending': return COLORS.warning;
      case 'rejected': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const ecoStats = calculateEcoStats();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.profileInfo}>
            <Image 
              source={{ 
                uri: userProfile?.photo_url || 'https://via.placeholder.com/80x80?text=User' 
              }} 
              style={styles.profileImage} 
            />
            <View style={styles.profileText}>
              <View style={styles.nameContainer}>
                <Text style={styles.profileName}>{userProfile?.name || 'User'}</Text>
                <TouchableOpacity onPress={handleEditName} style={styles.editNameButton}>
                  <Ionicons name="pencil" size={16} color="white" />
                </TouchableOpacity>
                {userProfile?.verified && (
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                )}
              </View>
              <Text style={styles.profileEmail}>{user?.email || user?.phone}</Text>
              <View style={styles.ecoPointsContainer}>
                <Ionicons name="leaf" size={16} color="white" />
                <Text style={styles.ecoPointsText}>
                  {userProfile?.eco_points || 0} Eco Points
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.messagesButton} 
              onPress={() => navigation.navigate('Conversations')}
            >
              <Ionicons name="chatbubbles-outline" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Eco Impact Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Eco Impact</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="repeat" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{ecoStats.totalTransactions}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color={COLORS.secondary} />
            <Text style={styles.statNumber}>₹{ecoStats.totalSavings}</Text>
            <Text style={styles.statLabel}>Money Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="leaf" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{ecoStats.totalCO2Saved}kg</Text>
            <Text style={styles.statLabel}>CO₂ Saved</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'transactions' && styles.activeTabText
          ]}>
            Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'items' && styles.activeTab]}
          onPress={() => setActiveTab('items')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'items' && styles.activeTabText
          ]}>
            My Items
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'transactions' ? (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="swap-horizontal" size={60} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No transactions yet</Text>
                <Text style={styles.emptySubtext}>Start swapping to see your history</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={userItems}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            key={"useritems-2"}
            scrollEnabled={false}
            columnWrapperStyle={styles.itemRow}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="add-circle" size={60} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No items added yet</Text>
                <TouchableOpacity 
                  style={styles.addItemButton}
                  onPress={() => navigation.navigate('AddItem')}
                >
                  <Text style={styles.addItemButtonText}>Add Your First Item</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditNameModal(false)}
                disabled={isUpdatingName}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, isUpdatingName && styles.disabledButton]}
                onPress={handleUpdateName}
                disabled={isUpdatingName}
              >
                <Text style={styles.saveButtonText}>
                  {isUpdatingName ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
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
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
  },
  profileText: {
    marginLeft: 15,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 8,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  ecoPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ecoPointsText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoButton: {
    padding: 8,
    marginRight: 8,
  },
  messagesButton: {
    padding: 8,
    marginRight: 8,
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    padding: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  transactionContent: {
    flex: 1,
    marginLeft: 12,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  transactionUser: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  transactionStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    textTransform: 'capitalize',
  },
  ecoPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
    marginTop: 4,
  },
  itemRow: {
    justifyContent: 'space-between',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  itemInfo: {
    marginTop: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
  addItemButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
  },
  addItemButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  editNameButton: {
    padding: 4,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: COLORS.border || '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});