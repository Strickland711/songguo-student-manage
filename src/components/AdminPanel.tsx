import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Crown, Users, Trash2 } from 'lucide-react';
import { MembershipTier } from '@/hooks/useUserRole';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  membership_tier: MembershipTier;
  created_at: string;
}

interface UserWithRole extends UserProfile {
  is_admin: boolean;
  email: string;
}

export const AdminPanel = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get user emails from auth
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Auth error:', authError);
      }

      const authUsers = authData?.users || [];

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const isAdmin = roles?.some(r => r.user_id === profile.user_id && r.role === 'admin') || false;
        const authUser = authUsers.find(u => u.id === profile.user_id);
        
        return {
          ...profile,
          is_admin: isAdmin,
          email: authUser?.email || '未知',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: '错误',
        description: '获取用户列表失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMembershipTier = async (userId: string, tier: MembershipTier) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ membership_tier: tier })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: '成功',
        description: '会员等级已更新',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating membership:', error);
      toast({
        title: '错误',
        description: '更新会员等级失败',
        variant: 'destructive',
      });
    }
  };

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
      }

      toast({
        title: '成功',
        description: isCurrentlyAdmin ? '已移除管理员权限' : '已授予管理员权限',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling admin role:', error);
      toast({
        title: '错误',
        description: '更新管理员权限失败',
        variant: 'destructive',
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('确定要删除此用户吗？此操作无法撤销。')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast({
        title: '成功',
        description: '用户已删除',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: '错误',
        description: '删除用户失败',
        variant: 'destructive',
      });
    }
  };

  const getMembershipBadge = (tier: MembershipTier) => {
    const variants = {
      free: { label: '免费用户', className: 'bg-gray-500' },
      premium: { label: '高级会员', className: 'bg-blue-500' },
      enterprise: { label: '企业会员', className: 'bg-purple-500' },
    };
    
    const config = variants[tier];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>用户管理</CardTitle>
          </div>
          <CardDescription>管理所有用户的权限和会员等级</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{user.full_name || user.username || '未命名用户'}</h3>
                      {user.is_admin && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          管理员
                        </Badge>
                      )}
                      {getMembershipBadge(user.membership_tier)}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select
                      value={user.membership_tier}
                      onValueChange={(value) => updateMembershipTier(user.user_id, value as MembershipTier)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">免费用户</SelectItem>
                        <SelectItem value="premium">高级会员</SelectItem>
                        <SelectItem value="enterprise">企业会员</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant={user.is_admin ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => toggleAdminRole(user.user_id, user.is_admin)}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      {user.is_admin ? '移除管理员' : '设为管理员'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteUser(user.user_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
