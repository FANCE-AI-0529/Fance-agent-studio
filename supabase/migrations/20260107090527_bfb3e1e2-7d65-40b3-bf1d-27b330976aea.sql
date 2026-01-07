-- =====================================================
-- 修复 WARN 2: agent_api_logs 表
-- =====================================================

-- 删除过度宽松的 INSERT 策略
DROP POLICY IF EXISTS "System can insert API logs" ON public.agent_api_logs;

-- 添加严格的 INSERT 策略（仅允许用户为自己的 agent 插入日志）
CREATE POLICY "Users can insert own agent API logs"
ON public.agent_api_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 修复 WARN 3: creator_earnings 表
-- =====================================================

-- 删除过度宽松的 INSERT 策略
DROP POLICY IF EXISTS "System can insert earnings" ON public.creator_earnings;

-- 收益只能由管理员或系统（service_role）写入
CREATE POLICY "Admins can insert earnings"
ON public.creator_earnings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 修复 WARN 4: webhook_logs 表
-- =====================================================

-- 删除过度宽松的 INSERT 策略
DROP POLICY IF EXISTS "System can insert webhook logs" ON public.webhook_logs;

-- 添加用户写入自己 webhook 日志的策略
CREATE POLICY "Users can insert own webhook logs"
ON public.webhook_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);