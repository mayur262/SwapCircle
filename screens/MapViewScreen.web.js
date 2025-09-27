import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// New color scheme from text.txt
const NEW_COLORS = {
  primary: "#137fec",
  backgroundLight: "#f6f7f8",
  backgroundDark: "#101922", // Assuming light mode for now
  text: '#101922',
  textSecondary: '#6c757d',
  border: '#e9ecef',
};

const { width } = Dimensions.get('window');

export default function MapViewScreen({ navigation, route }) {
  const { location, items, locationAddress, radiusKm: initialRadius } = route.params || {};
  const [radiusKm, setRadiusKm] = useState(initialRadius || 5);
  const [filteredItems, setFilteredItems] = useState(items || []);

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

  useEffect(() => {
    let out = items || [];
    if (location && location.coords) {
      out = out.filter((item) => {
        if (item.latitude && item.longitude) {
          const d = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            item.latitude,
            item.longitude
          );
          return d <= radiusKm;
        }
        return true; // Or false, depending on desired behavior for items without location
      });
    }
    setFilteredItems(out);
  }, [items, location, radiusKm]);

  const renderDistanceFilter = () => (
    <View style={styles.distanceFilterContainer}>
      <View style={styles.distanceFilter}>
        {[1, 2, 3, 4, 5].map((km) => (
          <TouchableOpacity
            key={km}
            style={[
              styles.distanceButton,
              radiusKm === km && styles.distanceButtonActive,
            ]}
            onPress={() => setRadiusKm(km)}
          >
            <Text style={[
              styles.distanceText,
              radiusKm === km && styles.distanceTextActive,
            ]}>
              {km}km
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderItemsList = () => (
    <View style={styles.itemsListContainer}>
        <Text style={styles.itemsTitle}>Items Near You</Text>
        {filteredItems && filteredItems.length > 0 ? (
            filteredItems.map((item) => (
            <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => navigation.navigate('ItemDetail', { item })}
            >
                <Image 
                    source={{ uri: `data:image/jpeg;base64,${item.photo_base64}` }} 
                    style={styles.itemImage} 
                />
                <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.price && (
                        <Text style={styles.itemPrice}>${item.price}</Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={24} color={NEW_COLORS.primary} />
            </TouchableOpacity>
            ))
        ) : (
            <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={NEW_COLORS.textSecondary} />
                <Text style={styles.emptyText}>No items found in this area.</Text>
                <Text style={styles.emptySubtext}>Try increasing the distance.</Text>
            </View>
        )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={NEW_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Map</Text>
      </View>
      
      <ScrollView>
        {renderDistanceFilter()}

        <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
                 {/* This is just a placeholder, not a real map */}
                 <Ionicons name="map-outline" size={80} color={NEW_COLORS.primary} />
                 <Text style={styles.mapPlaceholderText}>Map Preview</Text>
                 <Text style={styles.mapPlaceholderSubtext}>
                    {locationAddress || (location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'No location available')}
                 </Text>
            </View>
        </View>

        {renderItemsList()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NEW_COLORS.backgroundLight,
    fontFamily: 'Space Grotesk, sans-serif', // Approximation for web
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: NEW_COLORS.text,
    marginRight: 32, // balance the back button
  },
  distanceFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  distanceFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e9ecef',
    borderRadius: 9999,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  distanceButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
    alignItems: 'center',
  },
  distanceButtonActive: {
    backgroundColor: NEW_COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500',
    color: NEW_COLORS.textSecondary,
  },
  distanceTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mapContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  mapPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: NEW_COLORS.primary,
      marginTop: 8,
  },
  mapPlaceholderSubtext: {
      fontSize: 14,
      color: NEW_COLORS.textSecondary,
      marginTop: 4,
  },
  itemsListContainer: {
    paddingHorizontal: 16,
  },
  itemsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: NEW_COLORS.text,
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NEW_COLORS.text,
  },
  itemPrice: {
    fontSize: 14,
    color: NEW_COLORS.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
      alignItems: 'center',
      paddingVertical: 40,
  },
  emptyText: {
      fontSize: 16,
      fontWeight: '500',
      color: NEW_COLORS.textSecondary,
      marginTop: 8,
  },
  emptySubtext: {
      fontSize: 14,
      color: NEW_COLORS.textSecondary,
      marginTop: 4,
  }
});