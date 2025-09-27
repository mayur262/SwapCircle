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
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchItems();
    getLocation();
  }, []);

  useFocusEffect(React.useCallback(() => {
    fetchItems();
    return () => {};
  }, []));

  useEffect(() => {
    filterItems();
  }, [items, selectedCategory, selectedType, searchQuery]);

  const getLocation = async () => {
    try {
      setLocationLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your current location.');
        setLocationLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation(currentLocation);
      
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
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.itemLocation} numberOfLines={1}>{item.users?.name}</Text>
          {itemType && (
            <View style={[styles.typeTag, { backgroundColor: itemType.color }]}>
              <Text style={styles.typeTagText}>{itemType.name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <Text style={styles.headerTitle}>SwapCircle</Text>
      </View>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
                <Ionicons name="location-outline" size={24} color={COLORS.text} />
                {locationLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Conversations')}>
                <Ionicons name="chatbubbles-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for anything..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
            {renderCategoryFilter()}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>Try changing your filters or search query.</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContainer: {
    paddingHorizontal: 8,
  },
  fixedHeader: {
    backgroundColor: COLORS.surface,
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10, // Adjusted padding
    paddingBottom: 10,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  notificationButton: {},
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInputWrapper: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryContainer: {
    paddingVertical: 10,
  },
  categoryContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  categoryTextActive: {
    color: 'white',
  },
  itemCard: {
    flex: 1,
    margin: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: '100%',
    height: 150,
  },
  itemContent: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  typeTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});