-- =====================================================
-- 加强 invitations 表安全：防止邮箱被批量收集
-- =====================================================

-- 删除过于宽松的 SELECT 策略
DROP POLICY IF EXISTS "Anyone can check invite code validity" ON public.invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.invitations;

-- 用户只能查看自己发送或接收的邀请
CREATE POLICY "Users can view own sent or received invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() = inviter_id 
  OR auth.uid() = invited_user_id
);

-- 管理员可以查看所有邀请（已通过之前的迁移添加，确保存在）
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
CREATE POLICY "Admins can view all invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 匿名用户禁止查询邀请表（防止批量收集）
-- 邀请码验证应通过后端 Edge Function 使用 service_role 进行
DROP POLICY IF EXISTS "Anon can check invite codes" ON public.invitations;