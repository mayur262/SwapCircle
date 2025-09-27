import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // User profile doesn't exist, create one
        const newProfile = {
          id: userId,
          name: user?.user_metadata?.name || 'User',
          email: user?.email,
          phone: user?.phone,
          eco_points: 0,
          verified: false
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('users')
          .insert([newProfile])
          .select()
          .single();

        if (!createError) {
          setUserProfile(createdProfile);
        }
      } else if (!error) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signInWithOTP = async (email, phone) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email || undefined,
        phone: phone || undefined,
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const verifyOTP = async (email, phone, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email || undefined,
        phone: phone || undefined,
        token,
        type: email ? 'email' : 'sms'
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectBase = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : undefined;
      const redirectTo = redirectBase ? `${redirectBase}/auth/v1/callback` : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        }
      });

      if (error) return { data: null, error };

      // Manually navigate to the provider URL to avoid being blocked in preview/iframe environments
      if (data?.url && typeof window !== 'undefined') {
        window.location.assign(data.url);
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (!error) {
        setUserProfile(data);
      }
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signInWithOTP,
    verifyOTP,
    signInWithGoogle,
    signOut,
    updateProfile,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};