import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { COLORS } from './constants';
import { supabase } from './lib/supabase';

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import OTPVerificationScreen from './screens/auth/OTPVerificationScreen';

// Main Screens
import FeedScreen from './screens/FeedScreen';
import AddItemScreen from './screens/AddItemScreen';
import ProfileScreen from './screens/ProfileScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';
import DemoHelperScreen from './screens/DemoHelperScreen';
import ItemDetailScreen from './screens/ItemDetailScreen';
import MapViewScreen from './screens/MapViewScreen';
import ChatScreen from './screens/ChatScreen'; // Import ChatScreen
import ConversationsScreen from './screens/ConversationsScreen'; // Import ConversationsScreen
import PickupPhotosScreen from './screens/PickupPhotosScreen';
import OrdersScreen from './screens/OrdersScreen';
import OrderDetailScreen from './screens/OrderDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'AddItem') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="AddItem" 
        component={AddItemScreen}
        options={{ tabBarLabel: 'Add Item' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TransactionDetail" 
        component={TransactionDetailScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="DemoHelper" 
        component={DemoHelperScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ItemDetail" 
        component={ItemDetailScreen}
        options={{ headerShown: true, title: 'Item Details' }}
      />
      <Stack.Screen 
        name="MapView" 
        component={MapViewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ headerShown: true, title: 'Chat' }}
      />
      <Stack.Screen 
        name="Conversations" 
        component={ConversationsScreen}
        options={{ headerShown: true, title: 'Messages' }}
      />
      <Stack.Screen
        name="PickupPhotos"
        component={PickupPhotosScreen}
        options={{ headerShown: true, title: 'Pickup Photos' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ headerShown: true, title: 'Order Details' }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You could add a loading screen here
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  // Handle Supabase OAuth redirect on web (PKCE code exchange)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const hasCode = url.searchParams.get('code');
      const hasError = url.searchParams.get('error_description');

      if (hasError) {
        console.error('OAuth error:', hasError);
      }

      if (hasCode) {
        supabase.auth.exchangeCodeForSession(window.location.href)
          .then(({ data, error }) => {
            if (error) {
              console.error('exchangeCodeForSession error:', error.message);
            } else {
              // Clean up the URL to remove auth params
              const cleanUrl = url.origin + url.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }
          })
          .catch((e) => console.error('exchangeCodeForSession exception:', e));
      }
    } catch (e) {
      // no-op
    }
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
