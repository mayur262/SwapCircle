import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { insertMockData, clearMockData } from '../utils/mockData';
import { COLORS } from '../constants';

export default function DemoHelperScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [dataInserted, setDataInserted] = useState(false);

  const handleInsertMockData = async () => {
    setLoading(true);
    try {
      const result = await insertMockData();
      setDataInserted(true);
      Alert.alert(
        'Success! 🎉',
        `Sample data created successfully!\n\n` +
        `📦 Sample Items: ${result.items}\n` +
        `👤 For User: You (current user)\n\n` +
        `You can now browse your items in the feed and test the app functionality!`,
        [{ text: 'Great!', onPress: () => navigation.navigate('Feed') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to insert mock data. Please try again.');
      console.error('Mock data insertion error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all mock data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await clearMockData();
              setDataInserted(false);
              Alert.alert('Success', 'All mock data cleared successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const DemoStep = ({ number, title, description, onPress, buttonText, completed = false }) => (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, completed && styles.stepNumberCompleted]}>
          {completed ? (
            <Ionicons name="checkmark" size={20} color="white" />
          ) : (
            <Text style={styles.stepNumberText}>{number}</Text>
          )}
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepDescription}>{description}</Text>
        </View>
      </View>
      {onPress && (
        <TouchableOpacity
          style={[styles.stepButton, completed && styles.stepButtonCompleted]}
          onPress={onPress}
          disabled={loading}
        >
          <Text style={[styles.stepButtonText, completed && styles.stepButtonTextCompleted]}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="flask" size={40} color="white" />
          <Text style={styles.headerTitle}>Demo Helper</Text>
          <Text style={styles.headerSubtitle}>
            Set up mock data and test the app
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Demo Setup Guide</Text>
          <Text style={styles.instructionText}>
            Follow these steps to set up the demo data and test all features of SwapCircle:
          </Text>
          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.warning} />
            <Text style={styles.warningText}>
              You must be logged in to insert mock data. Please sign in first if you haven't already.
            </Text>
          </View>
        </View>

        {/* Demo Steps */}
        <View style={styles.section}>
          <DemoStep
            number="1"
            title="Insert Mock Data"
            description="Add sample users, items, and transactions to test the app"
            buttonText={dataInserted ? "Data Inserted ✓" : "Insert Mock Data"}
            onPress={dataInserted ? null : handleInsertMockData}
            completed={dataInserted}
          />

          <DemoStep
            number="2"
            title="Test Authentication"
            description="Try logging in with email or phone OTP"
            buttonText="Go to Login"
            onPress={() => navigation.navigate('Login')}
          />

          <DemoStep
            number="3"
            title="Browse Items"
            description="Check out the feed with sample items and filters"
            buttonText="View Feed"
            onPress={() => navigation.navigate('Feed')}
          />

          <DemoStep
            number="4"
            title="Add New Item"
            description="Test adding a new item with photo upload"
            buttonText="Add Item"
            onPress={() => navigation.navigate('AddItem')}
          />

          <DemoStep
            number="5"
            title="Check Eco Dashboard"
            description="View environmental impact and leaderboard"
            buttonText="Eco Dashboard"
            onPress={() => navigation.navigate('EcoDashboard')}
          />

          <DemoStep
            number="6"
            title="View Profile"
            description="Check user profile and transaction history"
            buttonText="View Profile"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        {/* Demo Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ What You Can Test</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>Email/Phone OTP Authentication</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>Item Browsing with Filters</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>Swap/Rent/Donate/Recycle Requests</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>Photo Upload for Items</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>Eco-Points & Environmental Impact</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>User Profiles & Transaction History</Text>
            </View>
          </View>
        </View>

        {/* Clear Data Option */}
        {dataInserted && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearData}
              disabled={loading}
            >
              <Ionicons name="trash" size={20} color={COLORS.error} />
              <Text style={styles.clearButtonText}>Clear All Mock Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
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
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberCompleted: {
    backgroundColor: COLORS.success,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  stepButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  stepButtonCompleted: {
    backgroundColor: COLORS.success,
  },
  stepButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  stepButtonTextCompleted: {
    color: 'white',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  clearButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});