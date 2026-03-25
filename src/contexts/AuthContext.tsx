import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Save or update user profile data in the database
  const saveUserProfile = async (currentUser: User) => {
    if (!currentUser) return;
    
    try {
      // Check if the profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      const userData = {
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
        avatar_url: currentUser.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString(),
      };
      
      let error;
      
      if (!existingProfile) {
        // If profile doesn't exist, create a new one
        console.log('Creating new user profile for:', currentUser.email);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            ...userData,
            created_at: new Date().toISOString()
          }]);
        
        error = insertError;
      } else {
        // If profile exists, update it
        console.log('Updating existing profile for:', currentUser.email);
        const { error: updateError } = await supabase
          .from('profiles')
          .update(userData)
          .eq('id', currentUser.id);
        
        error = updateError;
      }
      
      if (error) {
        console.error('Error saving user profile to database:', error);
      }
    } catch (error) {
      console.error('Error in saveUserProfile:', error);
    }
  };

  // Check if user is admin
  useEffect(() => {
    if (user?.email === 'adarshsinghh13@gmail.com') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Load session from localStorage on initial render
  useEffect(() => {
    const loadSessionFromStorage = async () => {
      setLoading(true);
      
      try {
        // First try to restore from session in localStorage
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error.message);
          throw error;
        }
        
        if (data?.session) {
          console.log('Session restored from storage:', data.session.user.email);
          setSession(data.session);
          setUser(data.session.user);
          
          // Save/update the user profile when session is restored
          await saveUserProfile(data.session.user);
        } else {
          console.log('No session found in storage');
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Session restoration error:', error);
        // Clear potentially corrupted session data
        await supabase.auth.signOut().catch(console.error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSessionFromStorage();
  }, []);

  // Function to manually refresh the session
  const refreshSession = async () => {
    try {
      console.log('Manually refreshing session');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error.message);
        throw error;
      }
      
      if (data?.session) {
        console.log('Session refreshed successfully:', data.session.user.email);
        setSession(data.session);
        setUser(data.session.user);
        
        // Save/update user profile when session is refreshed
        await saveUserProfile(data.session.user);
      } else {
        console.warn('No session returned from refresh');
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  };

  // Listen for auth changes
  useEffect(() => {
    console.log('Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', currentSession?.user?.email);
          toast.success(`Welcome, ${currentSession?.user?.email}`);
          
          // Save/update the user profile on sign in
          if (currentSession?.user) {
            await saveUserProfile(currentSession.user);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          toast.info('You have been signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed for user:', currentSession?.user?.email);
        } else if (event === 'USER_UPDATED') {
          console.log('User updated:', currentSession?.user?.email);
          
          // Update the user profile when user data changes
          if (currentSession?.user) {
            await saveUserProfile(currentSession.user);
          }
        }
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out user');
      
      // Clear any locally stored session data first
      localStorage.removeItem('supabase.auth.token');
      localStorage.clear();
      
      // Force clear session state before API call
      setUser(null);
      setSession(null);
      
      // Sign out from supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Clear browser storage and redirect
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      toast.error('Error signing out');
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
