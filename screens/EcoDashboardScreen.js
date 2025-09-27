import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, ECO_IMPACT } from '../constants';

const { width } = Dimensions.get('window');

const StatCard = ({ icon, value, label, color, delay }) => (
  <Animatable.View animation="fadeInUp" duration={800} delay={delay} style={[styles.statCard, { backgroundColor: color }]}>
    <Ionicons name={icon} size={32} color="#fff" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Animatable.View>
);

const ActivityItem = ({ item, delay }) => (
  <Animatable.View animation="fadeInRight" duration={800} delay={delay} style={styles.activityItem}>
    <View style={styles.activityIconContainer}>
      <Ionicons name={item.icon} size={24} color={COLORS.primary} />
    </View>
    <View style={styles.activityTextContainer}>
      <Text style={styles.activityText}>{item.description}</Text>
      <Text style={styles.activityTimestamp}>{item.timestamp}</Text>
    </View>
  </Animatable.View>
);

export default function EcoDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ itemsListed: 0, swaps: 0, moneySaved: 0, co2Saved: 0 });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      // Fetch user's items and calculate stats
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, type, created_at')
        .eq('user_id', user.id);

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
      } else {
        const itemsListed = items.length;
        const swaps = items.filter(item => item.type === 'swap').length;
        const moneySaved = (swaps * ECO_IMPACT.MONEY_SAVED_PER_TRANSACTION).toFixed(2);
        const co2Saved = (itemsListed * ECO_IMPACT.CO2_SAVED_PER_TRANSACTION).toFixed(2);
        setStats({ itemsListed, swaps, moneySaved, co2Saved });

        // Create mock recent activity
        const activity = items.slice(0, 5).map(item => ({
          id: item.id,
          icon: 'add-circle-outline',
          description: `You listed a new item for ${item.type}.`,
          timestamp: new Date(item.created_at).toLocaleDateString(),
        }));
        setRecentActivity(activity);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animatable.View animation="fadeInDown" duration={800}>
          <Text style={styles.headerSubtitle}>Welcome Back,</Text>
          <Text style={styles.headerTitle}>{user?.user_metadata?.full_name || 'Eco Warrior'}</Text>
        </Animatable.View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Animatable.Image
            animation="fadeInRight"
            duration={800}
            source={{ uri: user?.user_metadata?.avatar_url || 'https://i.pravatar.cc/150' }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Animatable.Text animation="fadeIn" duration={800} delay={700} style={styles.sectionTitle}>
          Recent Activity
        </Animatable.Text>
        <FlatList
          data={recentActivity}
          renderItem={({ item, index }) => <ActivityItem item={item} delay={800 + index * 100} />}
          keyExtractor={item => item.id.toString()}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Added padding to bring the header down
    paddingBottom: 10,
    backgroundColor: '#F9F9F9', // Added background color to match the container
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 50) / 2,
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    color: COLORS.text,
  },
  activityTimestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  separator: {
    height: 10,
  },
});