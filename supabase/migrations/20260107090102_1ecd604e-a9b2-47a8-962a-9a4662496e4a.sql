-- 1. 管理员可以查看所有邀请码
CREATE POLICY "Admins can view all invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. 管理员可以插入邀请码（批量生成）
CREATE POLICY "Admins can insert invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. 管理员可以更新邀请码
CREATE POLICY "Admins can update invitations"
ON public.invitations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. 管理员可以删除邀请码
CREATE POLICY "Admins can delete invitations"
ON public.invitations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. 管理员可以查看所有用户角色
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));