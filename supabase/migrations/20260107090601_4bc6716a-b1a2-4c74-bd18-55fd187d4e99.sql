-- =====================================================
-- 保护未发布技能：防止私有代码被窃取
-- =====================================================

-- 删除过于宽松的 SELECT 策略（如果存在）
DROP POLICY IF EXISTS "Anyone can view skills" ON public.skills;
DROP POLICY IF EXISTS "Public skills are viewable by everyone" ON public.skills;

-- 已认证用户：可查看已发布的技能 或 自己的技能
CREATE POLICY "Users can view published or own skills"
ON public.skills
FOR SELECT
TO authenticated
USING (
  is_published = true 
  OR auth.uid() = author_id
);

-- 匿名用户：只能查看已发布的技能
CREATE POLICY "Anon can view published skills only"
ON public.skills
FOR SELECT
TO anon
USING (is_published = true);