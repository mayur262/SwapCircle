import { supabase } from '../lib/supabase';
import { CATEGORIES, ITEM_TYPES, ECO_IMPACT } from '../constants';

// Sample user data
const mockUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1234567890',
    photo_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    verified: true,
    eco_points: 250,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '+1234567891',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    verified: true,
    eco_points: 180,
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Carol Davis',
    email: 'carol@example.com',
    phone: '+1234567892',
    photo_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    verified: false,
    eco_points: 320,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'David Wilson',
    email: 'david@example.com',
    phone: '+1234567893',
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    verified: true,
    eco_points: 95,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Emma Brown',
    email: 'emma@example.com',
    phone: '+1234567894',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    verified: true,
    eco_points: 420,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Sample item data
const mockItems = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'KitchenAid Stand Mixer',
    description: 'Professional grade stand mixer, barely used. Perfect for baking enthusiasts!',
    photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    category: 'kitchen',
    type: 'rent',
    price: 25,
    location: 'Downtown, 2km away',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    user_id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Camping Tent (4-person)',
    description: 'Waterproof camping tent, used only twice. Great for weekend adventures!',
    photo_url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop',
    category: 'outdoor',
    type: 'swap',
    price: 0,
    location: 'Suburbs, 3km away',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'MacBook Pro 2019',
    description: 'Still in excellent condition. Upgrading to newer model.',
    photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
    category: 'electronics',
    type: 'swap',
    price: 0,
    location: 'City Center, 1km away',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004',
    user_id: '550e8400-e29b-41d4-a716-446655440004',
    title: 'Programming Books Collection',
    description: 'Collection of 15 programming books. Free to good home!',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    category: 'books',
    type: 'donate',
    price: 0,
    location: 'University Area, 4km away',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440005',
    user_id: '550e8400-e29b-41d4-a716-446655440005',
    title: 'Vintage Leather Sofa',
    description: 'Beautiful vintage leather sofa. Some wear but very comfortable.',
    photo_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
    category: 'furniture',
    type: 'rent',
    price: 40,
    location: 'Old Town, 2.5km away',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440006',
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Designer Winter Coat',
    description: 'Barely worn designer winter coat. Size M. Perfect condition.',
    photo_url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=300&fit=crop',
    category: 'clothing',
    type: 'swap',
    price: 0,
    location: 'Fashion District, 3.5km away',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440007',
    user_id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Kids Bicycle Set',
    description: 'Two kids bicycles with helmets. Outgrown by my children.',
    photo_url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
    category: 'toys',
    type: 'donate',
    price: 0,
    location: 'Family Neighborhood, 1.5km away',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440008',
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'Old Electronics for Parts',
    description: 'Various old electronics that can be recycled or used for parts.',
    photo_url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
    category: 'electronics',
    type: 'recycle',
    price: 0,
    location: 'Tech Hub, 4.5km away',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  }
];

// Sample transaction data
const mockTransactions = [
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    item_id: '660e8400-e29b-41d4-a716-446655440004',
    owner_id: '550e8400-e29b-41d4-a716-446655440004',
    borrower_id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'donate',
    status: 'completed',
    eco_points_awarded: ECO_IMPACT.POINTS_PER_TRANSACTION,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    item_id: '660e8400-e29b-41d4-a716-446655440001',
    owner_id: '550e8400-e29b-41d4-a716-446655440001',
    borrower_id: '550e8400-e29b-41d4-a716-446655440002',
    type: 'rent',
    status: 'pending',
    eco_points_awarded: 0,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440003',
    item_id: '660e8400-e29b-41d4-a716-446655440002',
    owner_id: '550e8400-e29b-41d4-a716-446655440002',
    borrower_id: '550e8400-e29b-41d4-a716-446655440003',
    swap_item_id: '660e8400-e29b-41d4-a716-446655440003',
    type: 'swap',
    status: 'completed',
    eco_points_awarded: ECO_IMPACT.POINTS_PER_TRANSACTION,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const insertMockData = async () => {
  try {
    console.log('🚀 Starting mock data insertion...');

    // Get current logged-in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('You must be logged in to insert mock data. Please sign in first.');
    }

    console.log('👤 Current user:', user.email || user.phone);

    // Ensure a profile exists for the current user (to satisfy FK on items.user_id)
    console.log('🔎 Ensuring user profile exists...');
    const { data: existingProfile, error: profileFetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileFetchError?.code === 'PGRST116' || !existingProfile) {
      console.log('🆕 Creating user profile...');
      const newProfile = {
        id: user.id,
        name: user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'User'),
        email: user.email || null,
        phone: user.phone || null,
        eco_points: 0,
        verified: false,
      };
      const { error: createProfileError } = await supabase.from('users').insert([newProfile]);
      if (createProfileError) {
        console.error('❌ Could not create user profile (likely due to RLS policy):', createProfileError);
        throw new Error(
          'Profile missing and creation blocked by RLS. Please add an INSERT policy on public.users to allow a logged-in user to insert their own profile. Example: CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id); After adding the policy, sign out and sign in again, then retry.'
        );
      } else {
        console.log('✅ User profile created');
      }
    } else if (profileFetchError && profileFetchError.code !== 'PGRST116') {
      console.error('❌ Error checking user profile:', profileFetchError);
      throw profileFetchError;
    } else {
      console.log('✅ User profile exists');
    }

    // Create sample items for the current user
    const currentUserItems = mockItems.slice(0, 5).map(item => {
      const { id, user_id, ...itemWithoutId } = item; // remove old ids
      return {
        ...itemWithoutId,
        user_id: user.id, // ✅ assign to logged-in user
      };
    });

    console.log('📦 Inserting sample items for current user...');
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .insert(currentUserItems);

    if (itemsError) {
      console.error('❌ Error inserting items:', itemsError);
      throw itemsError;
    }

    console.log('✅ Sample items inserted successfully');

    // No transactions here (they require multiple users)
    console.log('ℹ️ Skipping transactions - need more than one user');

    return {
      users: 1, // current user only
      items: currentUserItems.length,
      transactions: 0,
    };

  } catch (error) {
    console.error('❌ Error inserting mock data:', error);
    throw error;
  }
};


export const clearMockData = async () => {
  try {
    console.log('🧹 Clearing mock data...');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('You must be logged in to clear mock data. Please sign in first.');
    }

    // Clear current user's transactions and items only
    console.log('🔄 Clearing your transactions...');
    await supabase
      .from('transactions')
      .delete()
      .or(`owner_id.eq.${user.id},borrower_id.eq.${user.id}`);

    console.log('📦 Clearing your items...');
    await supabase
      .from('items')
      .delete()
      .eq('user_id', user.id);

    console.log('✅ Your mock data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing mock data:', error);
    throw error;
  }
};

export { mockUsers, mockItems, mockTransactions };