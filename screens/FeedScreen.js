import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { CATEGORIES, ITEM_TYPES, COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export default function FeedScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState('New York, NY');
  const [locationFullText, setLocationFullText] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  // const [radiusKm, setRadiusKm] = useState(50); // moved to MapView
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchItems();
    getLocation();
  }, []);

  useFocusEffect(React.useCallback(() => {
    // Refetch items when returning to the feed to ensure accepted items are hidden
    fetchItems();
    return () => {};
  }, []));

  useEffect(() => {
    filterItems();
  }, [items, selectedCategory, selectedType, searchQuery]);

  const getLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your current location.');
        setLocationLoading(false);
        return;
      }

      // Get current location
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation(currentLocation);
      
      // Reverse geocoding to full address
      let [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      if (address) {
        const parts = [
          address.name,
          address.street,
          address.city || address.subregion,
          address.region,
          address.postalCode,
          address.country,
        ].filter(Boolean);
        const full = parts.join(', ');
        setLocationFullText(full || 'Unknown Location');
        const cityOnly = address.city || address.subregion || address.region || address.country;
        setLocationText(cityOnly || 'Unknown Location');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          users (
            id,
            name,
            photo_url,
            verified
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching items:', error);
      } else {
        // Fetch accepted transactions to hide their items from the feed
        const { data: acceptedTx, error: txError } = await supabase
          .from('transactions')
          .select('item_id, status')
          .eq('status', 'accepted');

        if (txError) {
          console.error('Error fetching accepted transactions:', txError);
          setItems(data || []);
        } else {
          const acceptedItemIds = new Set((acceptedTx || []).map(t => t.item_id));
          const visibleItems = (data || []).filter(item => !acceptedItemIds.has(item.id));
          setItems(visibleItems);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filterItems = () => {
    let filtered = items;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (selectedType) {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(item => {
        const title = (item.title || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // Proximity filter moved to MapView

    setFilteredItems(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryContainer}
      contentContainerStyle={styles.categoryContent}
    >
      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryButton,
            selectedCategory === category.id && styles.categoryButtonActive
          ]}
          onPress={() => setSelectedCategory(category.id)}
        >
          <Ionicons 
            name={category.icon} 
            size={20} 
            color={selectedCategory === category.id ? 'white' : COLORS.primary} 
          />
          <Text style={[
            styles.categoryText,
            selectedCategory === category.id && styles.categoryTextActive
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTypeFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.typeContainer}
      contentContainerStyle={styles.typeContent}
    >
      <TouchableOpacity
        style={[
          styles.typeButton,
          !selectedType && styles.typeButtonActive
        ]}
        onPress={() => setSelectedType(null)}
      >
        <Text style={[
          styles.typeText,
          !selectedType && styles.typeTextActive
        ]}>
          All Types
        </Text>
      </TouchableOpacity>
      {ITEM_TYPES.map((type) => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.typeButton,
            { borderColor: type.color },
            selectedType === type.id && { backgroundColor: type.color }
          ]}
          onPress={() => setSelectedType(type.id)}
        >
          <Ionicons 
            name={type.icon} 
            size={16} 
            color={selectedType === type.id ? 'white' : type.color} 
          />
          <Text style={[
            styles.typeText,
            { color: selectedType === type.id ? 'white' : type.color }
          ]}>
            {type.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Distance radius chips for proximity filtering
  const renderDistanceFilter = () => null;

  const renderFeaturedItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.featuredCard}
      onPress={() => navigation.navigate('ItemDetail', { item })}
    >
      <Image 
  source={{ 
    uri: item.photo_base64 
      ? `data:image/jpeg;base64,${item.photo_base64}` 
      : 'https://via.placeholder.com/300x200?text=No+Image' 
  }} 
  style={styles.featuredImageSquare} 
/>

      <Text style={styles.featuredTitle} numberOfLines={1}>{item.title}</Text>
      {item.price && (
        <Text style={styles.priceText}>₹{item.price}</Text>
      )}
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    const itemType = ITEM_TYPES.find(type => type.id === item.type);
    
    return (
      <TouchableOpacity 
        style={styles.itemCard}
        onPress={() => navigation.navigate('ItemDetail', { item })}
      >
        <Image 
  source={{ 
    uri: item.photo_base64 
      ? `data:image/jpeg;base64,${item.photo_base64}` 
      : 'https://via.placeholder.com/300x200?text=No+Image' 
  }} 
  style={styles.itemImage} 
/>

        
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {itemType && (
              <View style={[styles.typeTag, { backgroundColor: itemType.color }]}>
                <Text><Ionicons name={itemType.icon} size={12} color="white" /></Text>
                <Text style={styles.typeTagText}>{itemType.name}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          {item.price && (
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          )}
          
          <View style={styles.itemFooter}>
            <View style={styles.ownerInfo}>
              <Image 
                source={{ 
                  uri: item.users?.photo_url || 'https://via.placeholder.com/30x30?text=U' 
                }} 
                style={styles.ownerAvatar} 
              />
              <Text style={styles.ownerName}>{item.users?.name}</Text>
              {item.users?.verified && (
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
              )}
            </View>
            
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
            <Ionicons name="location" size={20} color={COLORS.text} />
            {locationLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
            )}
            <Ionicons name="chevron-down" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SwapCircle</Text>
          <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Conversations')}>
            <Ionicons name="chatbubbles-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        {/* Search + Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search furniture, clothes..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => Alert.alert('Filters', 'Filter options coming soon') }>
            <Ionicons name="menu" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        {/* Distance Filter moved to MapView screen */}
        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddItem')}>
            <Text style={styles.actionButtonText}>Post Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => navigation.navigate('MapView', { location, items: filteredItems, locationAddress: locationFullText })}>
            <Text style={styles.actionButtonSecondaryText}>Map View</Text>
          </TouchableOpacity>
        </View>
        {/* Categories Grid */}
        <View style={styles.categoryGridSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={CATEGORIES}
            keyExtractor={(category) => category.id}
            numColumns={3}
            key={"categories-3"}
            scrollEnabled={false}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={styles.categoryGridContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.categoryGridItem} onPress={() => setSelectedCategory(item.id)}>
                <View style={styles.categoryIconBox}>
                  <Text><Ionicons name={item.icon} size={22} color={COLORS.primary} /></Text>
                </View>
                <Text style={styles.categoryLabel}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>Join the Community!</Text>
            <Text style={styles.promoSubtitle}>Share your eco-friendly tips and get rewarded.</Text>
          </View>
          <Text><Ionicons name="checkmark-circle" size={40} color={COLORS.primary} /></Text>
        </View>

        {/* Featured Items Grid */}
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Featured Items</Text>
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            numColumns={2}
            key={"featured-2"}
            scrollEnabled={false}
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
            contentContainerStyle={styles.featuredGrid}
            renderItem={renderFeaturedItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text><Ionicons name="search" size={60} color={COLORS.textSecondary} /></Text>
                <Text style={styles.emptyText}>No items found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              </View>
            }
          />
        </View>
      </ScrollView>
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
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    maxWidth: 160,
  },
  // distance filter styles
  distanceContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  distanceContent: {
    gap: 10,
  },
  distanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'white',
  },
  distanceButtonActive: {
    backgroundColor: COLORS.primary,
  },
  distanceText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  distanceTextActive: {
    color: 'white',
  },
  notificationButton: {
    padding: 6,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    height: 16,
    width: 16,
    borderRadius: 8,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
  },
  searchInput: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 14,
    color: COLORS.text,
  },
  filterButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 999,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonSecondaryText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryGridSection: {
    marginTop: 8,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  categoryGridContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  categoryGridItem: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconBox: {
    height: 64,
    width: 64,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  promoBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  promoSubtitle: {
    fontSize: 12,
    color: '#3b7f3d',
    marginTop: 4,
  },
  featuredSection: {
    marginTop: 16,
  },
  featuredGrid: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  featuredCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  featuredImageSquare: {
    width: '100%',
    aspectRatio: 1,
  },
  featuredTitle: {
    paddingHorizontal: 10,
    paddingTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  priceText: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
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
  },
});