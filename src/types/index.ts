export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  city?: string;
  lat?: number;
  lng?: number;
  streakDays: number;
  role: 'user' | 'vendor' | 'admin';
  loginCount?: number;
}

export interface Vendor {
  id: number;
  userId?: number;
  businessName: string;
  category: string;
  logoUrl?: string;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstNumber?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  subscriptionPlan: 'free' | 'growth' | 'professional' | 'enterprise';
  totalFollowers: number;
}

export interface Offer {
  id: number;
  vendorId: number;
  title: string;
  description?: string;
  category?: string;
  discountPercent: number;
  originalPrice?: number;
  offerPrice?: number;
  imageUrl?: string;
  bannerUrl?: string;
  couponCode?: string;
  redeemUrl?: string;
  maxRedemptions: number;
  currentRedemptions: number;
  validFrom?: string;
  validUntil?: string;
  isFeatured: boolean;
  isActive: boolean;
  views: number;
  clicks: number;
  saves: number;
  createdAt: string;
  videoUrl?: string;
  // joined vendor fields
  businessName?: string;
  vendorLogo?: string;
  vendorCity?: string;
  vendorAddress?: string;
  vendorLat?: number;
  vendorLng?: number;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorWebsite?: string;
  vendorCategory?: string;
  vendorDescription?: string;
  distance?: number;
  score?: number;
  avgRating?: number | null;
  reviewCount?: number;
  myReview?: { rating: number; comment: string | null } | null;
}

export interface OfferReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
  userAvatar?: string | null;
}

export interface Badge {
  id: number;
  name: string;
  icon: string;
  description: string;
  conditionType: string;
  conditionValue: number;
  earned: boolean;
  earnedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatarUrl?: string;
  city?: string;
  score: number;
  totalSaves: number;
  totalRedemptions: number;
  totalReviews: number;
}

export interface ABTest {
  id: number;
  offerA: Offer & { impressions: number; ctr: number };
  offerB: Offer & { impressions: number; ctr: number };
  confidence: number;
  winner: 'A' | 'B' | null;
  status: 'running' | 'completed' | 'paused';
  startedAt: string;
}

export interface GroupDeal {
  id: number;
  offerId: number;
  vendorId: number;
  minParticipants: number;
  currentParticipants: number;
  dealStatus: 'collecting' | 'activated' | 'expired';
  expiresAt: string;
  // joined
  title?: string;
  imageUrl?: string;
  discountPercent?: number;
  businessName?: string;
  vendorLogo?: string;
  progressPercent?: number;
  remaining?: number;
  participantsPreview?: { id: number; name: string; avatarUrl?: string }[];
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: string;
  offerId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface VendorStats {
  impressions: number;
  clicks: number;
  saves: number;
  redemptions: number;
  ctr: number;
  conversionRate: number;
  estimatedRevenue: number;
  roiScore: number;
}

export interface AudienceData {
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  peakHours: number[];
  topCities: { city: string; count: number }[];
  engagementRate: number;
  totalImpressions: number;
  totalClicks: number;
  totalSaves: number;
}

export interface BenchmarkData {
  vendor: { avgCtr: number; avgDiscount: number; offersPerMonth: number };
  categoryAvg: { avgCtr: number; avgDiscount: number; offersPerMonth: number };
  percentile: { ctr: number; discount: number; activity: number };
  category: string;
}

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  nextMilestone: number;
  daysUntilNext: number;
}

export type Language = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
