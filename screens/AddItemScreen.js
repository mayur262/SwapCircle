import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { CATEGORIES, ITEM_TYPES, COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import * as Location from 'expo-location';
import MapPreview from './MapPreview';

export default function AddItemScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();

  // Location state
  const [locationMode, setLocationMode] = useState('manual');
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // New: Borrow/Return dates (simple YYYY-MM-DD input for cross-platform)
  const [borrowStart, setBorrowStart] = useState('');
  const [borrowEnd, setBorrowEnd] = useState('');

  // Reset all form fields to initial state
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setType('');
    setPrice('');
    setLocation('');
    setImage(null);
    setLocationMode('manual');
    setLocationCoords(null);
    setLocationAddress('');
    setBorrowStart('');
    setBorrowEnd('');
  };
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };
 
  // No longer uploading to storage; image.base64 will be stored in DB directly
  const uploadImage = async (imageAsset, userId) => {
    // Simply return the base64 string; no upload needed
    return imageAsset?.base64 || null;
  };

  // Duplicate location helpers moved inside AddItemScreen component
  // Location helpers
  const formatAddress = (geo) => {
    if (!geo) return '';
    const parts = [geo.name, geo.street, geo.city || geo.district, geo.region, geo.postalCode, geo.country];
    return parts.filter(Boolean).join(', ');
  };

  const handleDetectLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to auto-detect your location.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setLocationCoords(coords);
      const geos = await Location.reverseGeocodeAsync(coords);
      const addr = geos && geos.length ? formatAddress(geos[0]) : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      setLocation(addr);
      setLocationAddress(addr);
    } catch (e) {
      console.error('detect location error', e);
      Alert.alert('Location Error', 'Unable to detect your location. Please enter it manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !category || !type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (type === 'rent' && !price) {
      Alert.alert('Error', 'Please enter a price for rental items');
      return;
    }

    if (type === 'recycle' && !price) {
      Alert.alert('Error', 'Please enter a price for recycle items');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = null;
      
      if (image) {
        photoUrl = await uploadImage(image, user.id);
      }

      const itemData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        type,
        price: ((type === 'rent' || type === 'recycle') && price) ? parseFloat(price) : null,
        location: location.trim() || 'Not specified',
        photo_base64: photoUrl,
      };

      const { data, error } = await supabase
        .from('items')
        .insert([itemData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reset the form after successful add
      resetForm();

      Alert.alert('Success', 'Item added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCategorySelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.filter(cat => cat.id !== 'all').map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryCard,
              category === cat.id && styles.categoryCardActive
            ]}
            onPress={() => setCategory(cat.id)}
          >
            <View style={[styles.categoryIcon, category === cat.id && styles.categoryIconActive]}>
              <Ionicons 
                name={cat.icon} 
                size={24} 
                color={category === cat.id ? COLORS.primary : COLORS.textSecondary} 
              />
            </View>
            <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Item Type</Text>
      <View style={styles.typeContainer}>
        {ITEM_TYPES.map((itemType) => (
          <TouchableOpacity
            key={itemType.id}
            style={styles.typeOption}
            onPress={() => setType(itemType.id)}
          >
            <Ionicons
              name={type === itemType.id ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={type === itemType.id ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={styles.typeLabel}>{itemType.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Item</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Upload Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Add Photos</Text>
          <TouchableOpacity style={styles.photoUploadContainer} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: `data:image/jpeg;base64,${image.base64}` }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.photoUploadPlaceholder}>
                <View style={styles.cameraIconContainer}>
                  <Ionicons name="camera-outline" size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.photoUploadTitle}>Add up to 5 photos</Text>
                <Text style={styles.photoUploadSubtitle}>Show the item's condition</Text>
                <TouchableOpacity style={styles.choosePhotosButton}>
                  <Text style={styles.choosePhotosText}>Choose Photos</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Item Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Item Details</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Item Title"
              maxLength={100}
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
        </View>

        {renderCategorySelector()}
        {renderTypeSelector()}

        {/* Contextual notes for selected type */}
        {type === 'recycle' && (
          <View style={styles.infoCard}>
            <Ionicons name="leaf" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>Recycle: Think of this as selling your old item at a fair price so someone can reuse it.</Text>
          </View>
        )}
        {type === 'donate' && (
          <View style={styles.infoCard}>
            <Ionicons name="gift" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>Donate: This is free — borrowers will propose their use window when requesting.</Text>
          </View>
        )}

        {/* Price Section */}
        {(type === 'rent' || type === 'recycle') && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Price</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder={type === 'rent' ? 'Enter rental price per day' : 'Enter selling price'}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Borrow & Return Dates are selected by borrower at checkout */}
        {(type === 'rent' || type === 'donate') && (
          <View style={styles.infoCard}>
            <Ionicons name="calendar" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>Borrow and return dates will be chosen by the borrower during checkout.</Text>
          </View>
        )}
        {/* Location Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Location</Text>

          {/* Mode toggle */}
          <View style={styles.locationModeToggle}>
            <TouchableOpacity
              onPress={() => setLocationMode('auto')}
              style={[styles.locationModeButton, locationMode === 'auto' && styles.locationModeButtonActive]}
            >
              <Ionicons name="locate-outline" size={16} color={locationMode === 'auto' ? '#fff' : COLORS.text} />
              <Text style={[styles.locationModeText, locationMode === 'auto' && styles.locationModeTextActive]}>Auto Detect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLocationMode('manual')}
              style={[styles.locationModeButton, locationMode === 'manual' && styles.locationModeButtonActive]}
            >
              <Ionicons name="pencil" size={16} color={locationMode === 'manual' ? '#fff' : COLORS.text} />
              <Text style={[styles.locationModeText, locationMode === 'manual' && styles.locationModeTextActive]}>Manual Entry</Text>
            </TouchableOpacity>
          </View>

          {locationMode === 'manual' ? (
            <View style={styles.locationInputContainer}>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter Location"
                maxLength={100}
              />
              <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} style={styles.locationIcon} />
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={[styles.detectButton, locationLoading && { opacity: 0.7 }]}
                onPress={handleDetectLocation}
                disabled={locationLoading}
              >
                <Ionicons name="locate" size={18} color="#fff" />
                <Text style={styles.detectButtonText}>{locationLoading ? 'Detecting…' : 'Detect Current Location'}</Text>
              </TouchableOpacity>
              {!!locationAddress && (
                <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}> 
                  <Ionicons name="location" size={18} color={COLORS.primary} />
                  <Text style={{ marginLeft: 8, color: COLORS.text }} numberOfLines={2}>{locationAddress}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.mapPreview}>
            {/* Platform-specific interactive map (native) or placeholder (web) */}
            <MapPreview coords={locationCoords} />
            {/* The below custom placeholder remains for extra overlay UI on web; on native MapPreview fills */}
            {Platform.OS === 'web' && (
              <View style={styles.mapPlaceholder}>
                <View style={styles.mapHeaderOverlay}>
                  <Ionicons name="location" size={18} color={COLORS.primary} />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {locationAddress || location || 'No location selected'}
                  </Text>
                </View>

                <Ionicons name="map" size={64} color={COLORS.primary} />
                <Text style={styles.mapPlaceholderText}>Interactive Map</Text>
                <Text style={styles.mapPlaceholderSubtext}>
                  {locationCoords ? `${locationCoords.latitude.toFixed(4)}, ${locationCoords.longitude.toFixed(4)}` : 'Select a location to preview'}
                </Text>

                <TouchableOpacity
                  style={styles.openMapButton}
                  onPress={() => navigation.navigate('MapView', { location: locationCoords ? { coords: locationCoords } : null, items: [], locationAddress: locationAddress || location })}
                >
                  <Ionicons name="map-outline" size={16} color="#fff" />
                  <Text style={styles.openMapButtonText}>Open Map</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Adding Item...' : 'Add Item'}
          </Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'ios' ? 80 : 40,
    paddingBottom: 15,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  photoUploadContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoUploadPlaceholder: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    padding: 24,
  },
  cameraIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoUploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  photoUploadSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  choosePhotosButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  choosePhotosText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (Dimensions.get('window').width - 40 - 20) / 3,
    aspectRatio: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryCardActive: {
    backgroundColor: '#E8F5E8',
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  categoryIcon: {
    marginBottom: 8,
  },
  categoryIconActive: {},
  categoryText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  typeContainer: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  typeLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  locationInputContainer: {
    position: 'relative',
  },
  locationIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  mapPreview: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    height: 120,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  locationModeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  locationModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBackground,
  },
  locationModeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locationModeText: {
    marginLeft: 6,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  locationModeTextActive: {
    color: '#fff',
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  detectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  mapPlaceholder: {
    backgroundColor: COLORS.inputBackground,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapHeaderOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    color: COLORS.text,
    fontSize: 12,
    flex: 1,
  },
  mapPlaceholderText: {
    marginTop: 8,
    color: COLORS.text,
    fontWeight: '600',
  },
  mapPlaceholderSubtext: {
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openMapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // New: type contextual info card
  infoCard: {
    marginHorizontal: 20,
    marginTop: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: COLORS.text,
    flex: 1,
    fontSize: 13,
  },
});