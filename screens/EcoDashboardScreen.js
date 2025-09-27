import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { COLORS, ECO_IMPACT } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const NEW_COLORS = {
  primary: '#20df26',
  background: '#f6f8f6',
  text: '#112112',
  textSecondary: '#6c757d',
  border: '#e9ecef',
  white: '#ffffff',
  lightGreen: '#e6f9e7',
};

const StatCard = ({ icon, value, title, color }) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <Ionicons name={icon} size={28} color={NEW_COLORS.white} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const DidYouKnowCard = () => (
  <View style={styles.didYouKnowCard}>
    <Ionicons name="bulb-outline" size={24} color={NEW_COLORS.primary} />
    <Text style={styles.didYouKnowText}>
      Sharing items can reduce your carbon footprint by up to 82%!
    </Text>
  </View>
);

const LeaderboardItem = ({ item, index, currentUserId }) => (
  <View
    style={[
      styles.leaderboardItem,
      item.id === currentUserId && styles.currentUserItem,
    ]}
  >
    <Text style={styles.leaderboardRank}>{index + 1}</Text>
    <Image
      source={{ uri: item.photo_url || 'https://via.placeholder.com/40' }}
      style={styles.leaderboardAvatar}
    />
    <Text style={styles.leaderboardName}>{item.name}</Text>
    <Text style={styles.leaderboardPoints}>{item.eco_points} pts</Text>
  </View>
);

export default function EcoDashboardScreen() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    totalTransactions: 0,
    totalSavings: 0,
    totalCO2Saved: 0,
  });
  const { user, userProfile } = useAuth();

  useEffect(() => {
    fetchEcoData();
  }, [user]);

  const fetchEcoData = async () => {
    // Mock data for demonstration
    setGlobalStats({
      totalTransactions: 1245,
      totalSavings: 249000,
      totalCO2Saved: 1867,
    });
    setLeaderboard([
      { id: '1', name: 'Alice', eco_points: 5800, photo_url: 'https://i.pravatar.cc/40?u=1' },
      { id: '2', name: 'Bob', eco_points: 5200, photo_url: 'https://i.pravatar.cc/40?u=2' },
      { id: '3', name: 'Charlie', eco_points: 4800, photo_url: 'https://i.pravatar.cc/40?u=3' },
      { id: '4', name: 'David', eco_points: 4500, photo_url: 'https://i.pravatar.cc/40?u=4' },
      { id: '5', name: 'You', eco_points: 4200, photo_url: userProfile?.photo_url || 'https://i.pravatar.cc/40?u=5' },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Hello,</Text>
          <Text style={styles.headerUserName}>{userProfile?.name || 'Eco Warrior'}</Text>
        </View>
        <View style={styles.headerPointsContainer}>
          <Ionicons name="leaf-outline" size={24} color={NEW_COLORS.primary} />
          <Text style={styles.headerPoints}>
            {userProfile?.eco_points || 4200} pts
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="swap-horizontal-outline"
          value={globalStats.totalTransactions.toLocaleString()}
          title="Total Swaps"
          color="#4caf50"
        />
        <StatCard
          icon="wallet-outline"
          value={`₹${globalStats.totalSavings.toLocaleString()}`}
          title="Money Saved"
          color="#2196f3"
        />
        <StatCard
          icon="cloud-outline"
          value={`${globalStats.totalCO2Saved}kg`}
          title="CO₂ Reduced"
          color="#ff9800"
        />
      </View>

      <DidYouKnowCard />

      <View style={styles.leaderboardContainer}>
        <Text style={styles.sectionTitle}>Eco Champions</Text>
        {leaderboard.map((item, index) => (
          <LeaderboardItem
            key={item.id}
            item={item}
            index={index}
            currentUserId={user?.id || '5'}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NEW_COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerGreeting: {
    fontSize: 24,
    color: NEW_COLORS.textSecondary,
  },
  headerUserName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: NEW_COLORS.text,
  },
  headerPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEW_COLORS.lightGreen,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  headerPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NEW_COLORS.primary,
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NEW_COLORS.white,
    marginTop: 10,
  },
  statTitle: {
    fontSize: 14,
    color: NEW_COLORS.white,
    marginTop: 5,
  },
  didYouKnowCard: {
    backgroundColor: NEW_COLORS.lightGreen,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  didYouKnowText: {
    fontSize: 16,
    color: NEW_COLORS.text,
    marginLeft: 15,
    flex: 1,
  },
  leaderboardContainer: {
    backgroundColor: NEW_COLORS.white,
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: NEW_COLORS.text,
    marginBottom: 15,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  currentUserItem: {
    backgroundColor: NEW_COLORS.lightGreen,
    borderRadius: 10,
    marginHorizontal: -10,
    paddingHorizontal: 10,
  },
  leaderboardRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NEW_COLORS.textSecondary,
    width: 30,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 15,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '500',
    color: NEW_COLORS.text,
    flex: 1,
  },
  leaderboardPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NEW_COLORS.primary,
  },
});