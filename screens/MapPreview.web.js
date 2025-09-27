import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export default function MapPreview({ coords }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>
        {coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'No location selected'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});