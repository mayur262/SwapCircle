import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
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

const { width, height } = Dimensions.get('window');

export default function MapViewScreen({ navigation, route }) {
  const { location, items, locationAddress, radiusKm: initialRadius } = route.params || {};
  const [mapRegion, setMapRegion] = useState(null);
  const [radiusKm, setRadiusKm] = useState(initialRadius || 5);
  const [filteredItems, setFilteredItems] = useState(items || []);

  let MapView, Marker, Circle;
  if (Platform.OS !== 'web') {
    const maps = require('react-native-maps');
    MapView = maps?.default || maps;
    Marker = maps?.Marker || maps?.default?.Marker;
    Circle = maps?.Circle || maps?.default?.Circle;
  }

  useEffect(() => {
    if (location && location.coords) {
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [location]);

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
        return true;
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
                    <Text style={styles.itemTitleText}>{item.title}</Text>
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
            {Platform.OS !== 'web' && mapRegion && MapView ? (
                <MapView
                    style={{ flex: 1 }}
                    initialRegion={mapRegion}
                    onRegionChangeComplete={setMapRegion}
                >
                    {location?.coords && Marker && (
                        <Marker
                            coordinate={location.coords}
                            title="Your Location"
                            pinColor={NEW_COLORS.primary}
                        />
                    )}
                    {!!radiusKm && location?.coords && Circle && (
                        <Circle
                            center={location.coords}
                            radius={radiusKm * 1000}
                            strokeWidth={2}
                            strokeColor={`${NEW_COLORS.primary}80`} // 50% opacity
                            fillColor={`${NEW_COLORS.primary}20`} // 12.5% opacity
                        />
                    )}
                    {Marker && filteredItems
                        ?.filter(it => it.latitude && it.longitude)
                        .map(it => (
                            <Marker
                                key={it.id}
                                coordinate={{ latitude: it.latitude, longitude: it.longitude }}
                                title={it.title}
                                description={it.description}
                            />
                        ))}
                </MapView>
            ) : (
                <View style={styles.mapPlaceholder}>
                    <Ionicons name="map-outline" size={80} color={NEW_COLORS.primary} />
                    <Text style={styles.mapPlaceholderText}>Map Preview</Text>
                    <Text style={styles.mapPlaceholderSubtext}>
                        {locationAddress || (location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'No location available')}
                    </Text>
                </View>
            )}
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', // System fonts
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 50, // Adjust for status bar
    paddingBottom: 12,
    paddingHorizontal: 16,
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
    height: height * 0.4, // 40% of screen height
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden', // Clip map to rounded corners
    backgroundColor: '#e9ecef', // Placeholder background
  },
  mapPlaceholder: {
    flex: 1,
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
    paddingTop: 20,
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
    elevation: 2,
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
  itemTitleText: {
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