// ============================================================================
// Economy System Types - Token Wallet, Skill Pricing & Monetization
// ============================================================================

// =========================
// Token Wallet Types
// =========================

export interface TokenWallet {
  id: string;
  userId: string;
  balance: number;           // Available balance
  frozenBalance: number;     // Frozen balance (pre-authorization)
  lifetimeSpent: number;     // Total spent
  lifetimeEarned: number;    // Total earned (for creators)
  createdAt: Date;
  updatedAt: Date;
}

// Token transaction types
export type TokenTransactionType = 
  | 'topup'      // Recharge
  | 'consume'    // Consumption (skill usage)
  | 'earn'       // Creator earnings
  | 'refund'     // Refund
  | 'bonus'      // Platform bonus
  | 'withdraw';  // Creator withdrawal

export interface TokenTransaction {
  id: string;
  userId: string;
  transactionType: TokenTransactionType;
  amount: number;              // Positive = income, Negative = expense
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: 'skill_usage' | 'topup_order' | 'settlement' | 'subscription';
  referenceId?: string;
  description: string;
  createdAt: Date;
}

// Token hold for pre-authorization
export interface TokenHold {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
  expiresAt: Date;
  releasedAt?: Date;
  createdAt: Date;
}

// =========================
// Skill Pricing Types
// =========================

export type PricingModel = 'free' | 'per_call' | 'subscription' | 'one_time';

export interface BulkDiscount {
  minCalls: number;          // Minimum calls for discount
  discountPercent: number;   // Discount percentage (0-100)
}

export interface SkillPricing {
  id: string;
  skillId: string;
  pricingModel: PricingModel;
  
  // Per-call pricing
  pricePerCall?: number;      // Price per call (Token)
  
  // Subscription pricing
  monthlyPrice?: number;      // Monthly fee (Token)
  yearlyPrice?: number;       // Yearly fee (Token)
  
  // One-time purchase
  oneTimePrice?: number;      // Buy-out price (Token)
  
  // Additional settings
  trialCalls?: number;        // Free trial calls
  bulkDiscounts?: BulkDiscount[];  // Bulk discounts
  
  // Revenue sharing
  creatorShare: number;       // Creator share ratio (default 0.7 = 70%)
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Skill with pricing info
export interface SkillWithPricing {
  id: string;
  name: string;
  description?: string;
  authorId: string;
  pricing?: SkillPricing;
}

// =========================
// Skill Usage & Metering Types
// =========================

export interface SkillUsageRecord {
  id: string;
  userId: string;
  skillId: string;
  agentId?: string;
  
  // Billing info
  tokensCharged: number;
  pricingModel: PricingModel;
  
  // Execution info
  executionId?: string;
  success: boolean;
  
  // Revenue split
  creatorEarnings: number;
  platformFee: number;
  
  createdAt: Date;
}

// Usage statistics
export interface SkillUsageStats {
  skillId: string;
  totalCalls: number;
  successfulCalls: number;
  totalTokensCharged: number;
  totalCreatorEarnings: number;
  uniqueUsers: number;
  averageTokensPerCall: number;
}

// =========================
// Subscription Types
// =========================

export type SubscriptionStatus = 'active' | 'canceled' | 'expired';

export interface SkillSubscription {
  id: string;
  userId: string;
  skillId: string;
  pricingId: string;
  
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  
  autoRenew: boolean;
  createdAt: Date;
}

// =========================
// Topup & Payment Types
// =========================

export type PaymentMethod = 'stripe' | 'alipay' | 'wechat';
export type TopupStatus = 'pending' | 'paid' | 'completed' | 'failed' | 'refunded';

export interface TopupPackage {
  id: string;
  name: string;
  tokenAmount: number;
  bonusTokens: number;
  priceAmount: number;      // Price in cents
  currency: string;
  isPopular?: boolean;
  savings?: number;         // Percentage savings vs base rate
}

export interface TopupOrder {
  id: string;
  userId: string;
  
  // Purchase content
  tokenAmount: number;
  bonusTokens: number;
  
  // Payment
  paymentAmount: number;       // Payment amount (cents)
  currency: string;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  
  // Status
  status: TopupStatus;
  
  createdAt: Date;
  completedAt?: Date;
}

// =========================
// Revenue Settlement Types
// =========================

export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutMethod = 'bank' | 'alipay' | 'paypal' | 'stripe';

export interface RevenueSettlement {
  id: string;
  creatorId: string;
  
  // Settlement amount
  totalTokens: number;
  platformFee: number;
  netAmount: number;
  
  // Currency conversion
  currencyAmount?: number;
  currency?: string;
  exchangeRate?: number;
  
  // Status
  status: SettlementStatus;
  payoutMethod?: PayoutMethod;
  payoutDetails?: Record<string, unknown>;
  
  // Time
  periodStart: Date;
  periodEnd: Date;
  processedAt?: Date;
  createdAt: Date;
}

// Creator revenue summary
export interface CreatorRevenueSummary {
  creatorId: string;
  totalEarnings: number;
  pendingSettlement: number;
  lifetimeWithdrawn: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  topEarningSkills: {
    skillId: string;
    skillName: string;
    earnings: number;
  }[];
}

// =========================
// Metering Engine Types
// =========================

export interface MeteringRequest {
  skillId: string;
  userId: string;
  agentId?: string;
  executionId?: string;
}

export interface MeteringResult {
  charged: boolean;
  amount: number;
  creatorEarnings: number;
  platformFee: number;
  error?: string;
  subscription?: boolean;
  owned?: boolean;
  balanceAfter?: number;
}

export interface InsufficientBalanceError {
  error: 'INSUFFICIENT_BALANCE';
  required: number;
  available: number;
}

// =========================
// Constants
// =========================

export const PLATFORM_FEE_RATE = 0.30;  // 30% platform fee
export const CREATOR_SHARE_RATE = 0.70; // 70% creator share
export const MIN_WITHDRAWAL_AMOUNT = 1000; // Minimum tokens for withdrawal
export const SETTLEMENT_CYCLE_DAYS = 7;    // T+7 settlement cycle
export const NEW_USER_BONUS_TOKENS = 100;  // New user welcome bonus

// Default topup packages
export const TOPUP_PACKAGES: TopupPackage[] = [
  {
    id: 'starter',
    name: '入门包',
    tokenAmount: 500,
    bonusTokens: 0,
    priceAmount: 500,  // ¥5
    currency: 'CNY',
  },
  {
    id: 'basic',
    name: '基础包',
    tokenAmount: 1000,
    bonusTokens: 50,
    priceAmount: 980,  // ¥9.8
    currency: 'CNY',
    savings: 5,
  },
  {
    id: 'standard',
    name: '标准包',
    tokenAmount: 5000,
    bonusTokens: 500,
    priceAmount: 4500, // ¥45
    currency: 'CNY',
    isPopular: true,
    savings: 12,
  },
  {
    id: 'pro',
    name: '专业包',
    tokenAmount: 10000,
    bonusTokens: 1500,
    priceAmount: 8000, // ¥80
    currency: 'CNY',
    savings: 20,
  },
  {
    id: 'enterprise',
    name: '企业包',
    tokenAmount: 50000,
    bonusTokens: 10000,
    priceAmount: 35000, // ¥350
    currency: 'CNY',
    savings: 30,
  },
];

// =========================
// Utility Functions
// =========================

export function calculateCreatorEarnings(
  amount: number,
  creatorShare: number = CREATOR_SHARE_RATE
): { creatorEarnings: number; platformFee: number } {
  const creatorEarnings = Math.floor(amount * creatorShare);
  const platformFee = amount - creatorEarnings;
  return { creatorEarnings, platformFee };
}

export function formatTokenAmount(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}万`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return amount.toLocaleString();
}

export function getTopupPackageById(id: string): TopupPackage | undefined {
  return TOPUP_PACKAGES.find(pkg => pkg.id === id);
}

export function calculateBulkDiscount(
  basePrice: number,
  callCount: number,
  discounts: BulkDiscount[]
): number {
  if (!discounts || discounts.length === 0) return basePrice;
  
  // Sort by minCalls descending to find the best applicable discount
  const sortedDiscounts = [...discounts].sort((a, b) => b.minCalls - a.minCalls);
  const applicableDiscount = sortedDiscounts.find(d => callCount >= d.minCalls);
  
  if (!applicableDiscount) return basePrice;
  
  return Math.floor(basePrice * (1 - applicableDiscount.discountPercent / 100));
}
