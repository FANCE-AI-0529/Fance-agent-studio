-- ============================================================================
-- Economy System Tables - Token Wallets, Skill Pricing & Monetization
-- ============================================================================

-- Token Wallets Table
CREATE TABLE public.token_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  frozen_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT positive_frozen CHECK (frozen_balance >= 0)
);

-- Skill Pricing Table
CREATE TABLE public.skill_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('free', 'per_call', 'subscription', 'one_time')),
  
  price_per_call INTEGER DEFAULT 0,
  monthly_price INTEGER,
  yearly_price INTEGER,
  one_time_price INTEGER,
  
  trial_calls INTEGER DEFAULT 0,
  bulk_discounts JSONB DEFAULT '[]',
  
  creator_share NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(skill_id)
);

-- Skill Usage Records Table
CREATE TABLE public.skill_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  
  tokens_charged INTEGER NOT NULL DEFAULT 0,
  pricing_model TEXT NOT NULL,
  
  execution_id UUID,
  success BOOLEAN NOT NULL DEFAULT true,
  
  creator_earnings INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Token Transactions Table
CREATE TABLE public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'consume', 'earn', 'refund', 'bonus', 'withdraw')),
  
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  reference_type TEXT,
  reference_id UUID,
  
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Token Holds Table (Pre-authorization)
CREATE TABLE public.token_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skill Subscriptions Table
CREATE TABLE public.skill_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  pricing_id UUID NOT NULL REFERENCES public.skill_pricing(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, skill_id)
);

-- Topup Orders Table
CREATE TABLE public.topup_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  token_amount INTEGER NOT NULL,
  bonus_tokens INTEGER DEFAULT 0,
  
  payment_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  payment_method TEXT NOT NULL,
  payment_id TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'failed', 'refunded')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Revenue Settlements Table
CREATE TABLE public.revenue_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  
  total_tokens INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  net_amount INTEGER NOT NULL,
  
  currency_amount NUMERIC(10,2),
  currency TEXT,
  exchange_rate NUMERIC(10,4),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method TEXT,
  payout_details JSONB,
  
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_settlements ENABLE ROW LEVEL SECURITY;

-- Token Wallets: Users can only access their own wallet
CREATE POLICY "Users manage own wallet" ON public.token_wallets
  FOR ALL USING (auth.uid() = user_id);

-- Token Transactions: Users can only view their own transactions
CREATE POLICY "Users view own transactions" ON public.token_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Skill Usage: Users can view their own usage
CREATE POLICY "Users view own usage" ON public.skill_usage_records
  FOR SELECT USING (auth.uid() = user_id);

-- Skill Pricing: Creators can manage pricing for their skills
CREATE POLICY "Creators manage skill pricing" ON public.skill_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.skills 
      WHERE skills.id = skill_pricing.skill_id 
      AND skills.author_id = auth.uid()
    )
  );

-- Skill Pricing: Public can view active pricing
CREATE POLICY "Public view active pricing" ON public.skill_pricing
  FOR SELECT USING (is_active = true);

-- Token Holds: Users can view their own holds
CREATE POLICY "Users view own holds" ON public.token_holds
  FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions: Users manage their own subscriptions
CREATE POLICY "Users manage own subscriptions" ON public.skill_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Topup Orders: Users manage their own orders
CREATE POLICY "Users manage own orders" ON public.topup_orders
  FOR ALL USING (auth.uid() = user_id);

-- Settlements: Creators view their own settlements
CREATE POLICY "Creators view own settlements" ON public.revenue_settlements
  FOR SELECT USING (auth.uid() = creator_id);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_wallet_user ON public.token_wallets(user_id);
CREATE INDEX idx_pricing_skill ON public.skill_pricing(skill_id);
CREATE INDEX idx_usage_user_skill ON public.skill_usage_records(user_id, skill_id, created_at DESC);
CREATE INDEX idx_usage_skill ON public.skill_usage_records(skill_id, created_at DESC);
CREATE INDEX idx_transactions_user ON public.token_transactions(user_id, created_at DESC);
CREATE INDEX idx_holds_user ON public.token_holds(user_id, released_at);
CREATE INDEX idx_subscriptions_user ON public.skill_subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_skill ON public.skill_subscriptions(skill_id, status);
CREATE INDEX idx_orders_user ON public.topup_orders(user_id, status);
CREATE INDEX idx_settlements_creator ON public.revenue_settlements(creator_id, status);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to process skill payment atomically
CREATE OR REPLACE FUNCTION public.process_skill_payment(
  p_user_id UUID,
  p_skill_id UUID,
  p_creator_id UUID,
  p_amount INTEGER,
  p_creator_share INTEGER,
  p_platform_fee INTEGER,
  p_execution_id UUID DEFAULT NULL,
  p_pricing_model TEXT DEFAULT 'per_call'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_creator_balance_before INTEGER;
  v_creator_balance_after INTEGER;
  v_usage_id UUID;
BEGIN
  -- Get user's current balance
  SELECT balance INTO v_balance_before
  FROM token_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_balance_before IS NULL OR v_balance_before < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;
  
  -- Deduct from user wallet
  v_balance_after := v_balance_before - p_amount;
  UPDATE token_wallets
  SET 
    balance = v_balance_after,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record user transaction
  INSERT INTO token_transactions (user_id, transaction_type, amount, balance_before, balance_after, reference_type, description)
  VALUES (p_user_id, 'consume', -p_amount, v_balance_before, v_balance_after, 'skill_usage', '技能调用费用');
  
  -- Credit creator (create wallet if not exists)
  INSERT INTO token_wallets (user_id, balance, lifetime_earned)
  VALUES (p_creator_id, p_creator_share, p_creator_share)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = token_wallets.balance + p_creator_share,
    lifetime_earned = token_wallets.lifetime_earned + p_creator_share,
    updated_at = now()
  RETURNING balance - p_creator_share, balance INTO v_creator_balance_before, v_creator_balance_after;
  
  -- Record creator earnings transaction
  INSERT INTO token_transactions (user_id, transaction_type, amount, balance_before, balance_after, reference_type, description)
  VALUES (p_creator_id, 'earn', p_creator_share, COALESCE(v_creator_balance_before, 0), COALESCE(v_creator_balance_after, p_creator_share), 'skill_usage', '技能调用收入');
  
  -- Record usage
  INSERT INTO skill_usage_records (user_id, skill_id, tokens_charged, pricing_model, execution_id, creator_earnings, platform_fee)
  VALUES (p_user_id, p_skill_id, p_amount, p_pricing_model, p_execution_id, p_creator_share, p_platform_fee)
  RETURNING id INTO v_usage_id;
  
  -- Update creator_earnings table
  INSERT INTO creator_earnings (creator_id, skill_id, amount, transaction_type)
  VALUES (p_creator_id, p_skill_id, p_creator_share, 'skill_usage');
  
  RETURN jsonb_build_object(
    'success', true,
    'usage_id', v_usage_id,
    'charged', p_amount,
    'balance_after', v_balance_after
  );
END;
$$;

-- Function to create token hold (pre-authorization)
CREATE OR REPLACE FUNCTION public.create_token_hold(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_expires_minutes INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_frozen INTEGER;
  v_available INTEGER;
  v_hold_id UUID;
BEGIN
  -- Get current wallet state
  SELECT balance, frozen_balance INTO v_balance, v_frozen
  FROM token_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'WALLET_NOT_FOUND');
  END IF;
  
  v_available := v_balance - v_frozen;
  
  IF v_available < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE', 'available', v_available, 'required', p_amount);
  END IF;
  
  -- Create hold
  INSERT INTO token_holds (user_id, amount, reason, reference_id, expires_at)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id, now() + (p_expires_minutes || ' minutes')::interval)
  RETURNING id INTO v_hold_id;
  
  -- Update frozen balance
  UPDATE token_wallets
  SET frozen_balance = frozen_balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'hold_id', v_hold_id, 'available_after', v_available - p_amount);
END;
$$;

-- Function to release token hold
CREATE OR REPLACE FUNCTION public.release_token_hold(
  p_hold_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount INTEGER;
BEGIN
  -- Get and lock hold
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM token_holds
  WHERE id = p_hold_id AND released_at IS NULL
  FOR UPDATE;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'HOLD_NOT_FOUND');
  END IF;
  
  -- Mark as released
  UPDATE token_holds SET released_at = now() WHERE id = p_hold_id;
  
  -- Reduce frozen balance
  UPDATE token_wallets
  SET frozen_balance = GREATEST(0, frozen_balance - v_amount), updated_at = now()
  WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object('success', true, 'released', v_amount);
END;
$$;

-- Function to complete topup order
CREATE OR REPLACE FUNCTION public.complete_topup_order(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_token_amount INTEGER;
  v_bonus_tokens INTEGER;
  v_total_tokens INTEGER;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Get order details
  SELECT user_id, token_amount, bonus_tokens INTO v_user_id, v_token_amount, v_bonus_tokens
  FROM topup_orders
  WHERE id = p_order_id AND status = 'paid'
  FOR UPDATE;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND_OR_INVALID_STATUS');
  END IF;
  
  v_total_tokens := v_token_amount + COALESCE(v_bonus_tokens, 0);
  
  -- Get current balance
  SELECT balance INTO v_balance_before
  FROM token_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;
  
  IF v_balance_before IS NULL THEN
    -- Create wallet if not exists
    INSERT INTO token_wallets (user_id, balance)
    VALUES (v_user_id, v_total_tokens);
    v_balance_before := 0;
    v_balance_after := v_total_tokens;
  ELSE
    v_balance_after := v_balance_before + v_total_tokens;
    UPDATE token_wallets
    SET balance = v_balance_after, updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
  
  -- Record transaction
  INSERT INTO token_transactions (user_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description)
  VALUES (v_user_id, 'topup', v_total_tokens, v_balance_before, v_balance_after, 'topup_order', p_order_id, '充值 ' || v_token_amount || ' Token' || CASE WHEN v_bonus_tokens > 0 THEN ' (赠送 ' || v_bonus_tokens || ')' ELSE '' END);
  
  -- Mark order as completed
  UPDATE topup_orders
  SET status = 'completed', completed_at = now()
  WHERE id = p_order_id;
  
  RETURN jsonb_build_object('success', true, 'tokens_added', v_total_tokens, 'balance_after', v_balance_after);
END;
$$;