// 网络策略管理 Hook (Network Policy Hook)

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { NetworkPolicy, DomainRule, MPLPNetworkBinding } from '@/types/sandbox';
import { 
  MPLP_NETWORK_MAPPINGS, 
  SECURITY_PRESETS, 
  SecurityPresetKey,
  matchDomain,
  getDomainsForPermissions,
  checkNetworkAccess,
} from '@/types/networkPolicy';

interface StoredNetworkPolicy {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  whitelist: DomainRule[];
  mplp_bindings: MPLPNetworkBinding[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useNetworkPolicy() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [policies, setPolicies] = useState<StoredNetworkPolicy[]>([]);
  const [currentPolicy, setCurrentPolicy] = useState<NetworkPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 加载用户的网络策略
   */
  const loadPolicies = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('network_policies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Type assertion for the data
      const typedData = (data || []).map(item => ({
        ...item,
        whitelist: (item.whitelist as unknown as DomainRule[]) || [],
        mplp_bindings: (item.mplp_bindings as unknown as MPLPNetworkBinding[]) || [],
      }));
      
      setPolicies(typedData);
      
      // 设置默认策略
      const defaultPolicy = typedData.find(p => p.is_default);
      if (defaultPolicy) {
        setCurrentPolicy({
          mode: defaultPolicy.mode as NetworkPolicy['mode'],
          whitelist: defaultPolicy.whitelist,
          mplpBindings: defaultPolicy.mplp_bindings,
        });
      }
    } catch (err) {
      console.error('Failed to load network policies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  /**
   * 创建新策略
   */
  const createPolicy = useCallback(async (
    name: string,
    policy: NetworkPolicy,
    description?: string,
    isDefault = false
  ): Promise<string | null> => {
    if (!user) return null;
    
    try {
      // 如果设为默认，先取消其他默认策略
      if (isDefault) {
        await supabase
          .from('network_policies')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }
      
      const { data, error } = await supabase
        .from('network_policies')
        .insert([{
          user_id: user.id,
          name,
          description,
          mode: policy.mode,
          whitelist: JSON.parse(JSON.stringify(policy.whitelist)),
          mplp_bindings: JSON.parse(JSON.stringify(policy.mplpBindings)),
          is_default: isDefault,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: '策略创建成功',
        description: `网络策略 "${name}" 已创建`,
      });
      
      await loadPolicies();
      return data.id;
      
    } catch (err) {
      console.error('Failed to create policy:', err);
      toast({
        title: '创建失败',
        description: err instanceof Error ? err.message : '无法创建网络策略',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast, loadPolicies]);

  /**
   * 更新策略
   */
  const updatePolicy = useCallback(async (
    id: string,
    updates: Partial<NetworkPolicy & { name?: string; description?: string; is_default?: boolean }>
  ): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.mode) updateData.mode = updates.mode;
      if (updates.whitelist) updateData.whitelist = updates.whitelist;
      if (updates.mplpBindings) updateData.mplp_bindings = updates.mplpBindings;
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      
      if (updates.is_default) {
        // 先取消其他默认策略
        await supabase
          .from('network_policies')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
        updateData.is_default = true;
      }
      
      const { error } = await supabase
        .from('network_policies')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: '策略已更新',
      });
      
      await loadPolicies();
      return true;
      
    } catch (err) {
      console.error('Failed to update policy:', err);
      toast({
        title: '更新失败',
        description: err instanceof Error ? err.message : '无法更新网络策略',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, loadPolicies]);

  /**
   * 删除策略
   */
  const deletePolicy = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('network_policies')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: '策略已删除',
      });
      
      await loadPolicies();
      return true;
      
    } catch (err) {
      console.error('Failed to delete policy:', err);
      toast({
        title: '删除失败',
        description: err instanceof Error ? err.message : '无法删除网络策略',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, loadPolicies]);

  /**
   * 添加域名规则到当前策略
   */
  const addDomainRule = useCallback((rule: DomainRule) => {
    setCurrentPolicy(prev => {
      if (!prev) {
        return {
          mode: 'allow_whitelist',
          whitelist: [rule],
          mplpBindings: [],
        };
      }
      return {
        ...prev,
        whitelist: [...prev.whitelist, rule],
      };
    });
  }, []);

  /**
   * 移除域名规则
   */
  const removeDomainRule = useCallback((pattern: string) => {
    setCurrentPolicy(prev => {
      if (!prev) return null;
      return {
        ...prev,
        whitelist: prev.whitelist.filter(r => r.pattern !== pattern),
      };
    });
  }, []);

  /**
   * 应用预设策略
   */
  const applyPreset = useCallback((preset: SecurityPresetKey) => {
    setCurrentPolicy(SECURITY_PRESETS[preset].networkPolicy);
  }, []);

  /**
   * 检查域名是否被允许
   */
  const checkDomain = useCallback((
    domain: string, 
    grantedPermissions: string[] = []
  ): { allowed: boolean; reason?: string } => {
    if (!currentPolicy) {
      return { allowed: false, reason: 'No policy configured' };
    }
    return checkNetworkAccess(domain, currentPolicy, grantedPermissions);
  }, [currentPolicy]);

  /**
   * 获取 MPLP 权限映射
   */
  const getMPLPMappings = useCallback(() => {
    return MPLP_NETWORK_MAPPINGS;
  }, []);

  /**
   * 获取权限对应的域名
   */
  const getDomainsForPermission = useCallback((permission: string): string[] => {
    return MPLP_NETWORK_MAPPINGS[permission] || [];
  }, []);

  return {
    // 策略列表
    policies,
    isLoading,
    
    // 当前策略
    currentPolicy,
    setCurrentPolicy,
    
    // CRUD 操作
    createPolicy,
    updatePolicy,
    deletePolicy,
    loadPolicies,
    
    // 规则操作
    addDomainRule,
    removeDomainRule,
    
    // 预设
    applyPreset,
    presets: SECURITY_PRESETS,
    
    // 检查
    checkDomain,
    matchDomain,
    
    // MPLP 映射
    getMPLPMappings,
    getDomainsForPermission,
    getDomainsForPermissions,
  };
}
