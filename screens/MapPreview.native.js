import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export default function MapPreview({ coords }) {
  let MapView, Marker, Circle;
  try {
    const maps = require('react-native-maps');
    MapView = maps?.default || maps;
    Marker = maps?.Marker || maps?.default?.Marker;
    Circle = maps?.Circle || maps?.default?.Circle;
  } catch (e) {
    // Should never happen on native, but protect just in case
  }

  if (!coords || !MapView) {
    return (
      <View style={styles.placeholder}> 
        <Text style={styles.placeholderText}>No location selected</Text>
      </View>
    );
  }

  const region = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
        {Marker && (
          <Marker coordinate={{ latitude: coords.latitude, longitude: coords.longitude }} title="Selected Location" />
        )}
        {Circle && (
          <Circle
            center={{ latitude: coords.latitude, longitude: coords.longitude }}
            radius={300}
            strokeWidth={2}
            strokeColor="rgba(0, 122, 255, 0.6)"
            fillColor="rgba(0, 122, 255, 0.1)"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});