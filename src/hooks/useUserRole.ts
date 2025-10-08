import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type MembershipTier = 'free' | 'premium' | 'enterprise';

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setMembershipTier('free');
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        setIsAdmin(!!roleData);

        // Get membership tier
        const { data: profileData } = await supabase
          .from('profiles')
          .select('membership_tier')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setMembershipTier(profileData.membership_tier as MembershipTier);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const hasAccess = (feature: 'students' | 'scoring' | 'feedback') => {
    if (isAdmin) return true;
    
    switch (feature) {
      case 'students':
        return true; // All users can access
      case 'scoring':
      case 'feedback':
        return membershipTier === 'premium' || membershipTier === 'enterprise';
      default:
        return false;
    }
  };

  return { isAdmin, membershipTier, loading, hasAccess };
};
