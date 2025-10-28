import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        // 使用安全的 RPC 函数检查是否为管理员，避免 RLS 限制
        const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });
        if (error) {
          console.error('Error checking admin role via RPC:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { isAdmin, loading };
};
