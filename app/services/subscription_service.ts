import { DateTime } from 'luxon'
import AccountProfile, {
  DEFAULT_PROFILE_AVATAR_URL,
  DEFAULT_PROFILE_BANNER_URL,
} from '#models/account_profile'
import PlantScan from '#models/plant_scan'
import type User from '#models/user'

export type SubscriptionPlan = 'free' | 'premium'

export const FREE_SCANNER_MONTHLY_LIMIT = 5
const PREMIUM_SIGNUP_REWARD_POINTS = 150

export default class SubscriptionService {
  async ensureAccountProfile(user: User) {
    return AccountProfile.firstOrCreate(
      { userId: user.id },
      {
        userId: user.id,
        displayName: user.fullName || user.username,
        avatarUrl: DEFAULT_PROFILE_AVATAR_URL,
        bannerUrl: DEFAULT_PROFILE_BANNER_URL,
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: FREE_SCANNER_MONTHLY_LIMIT,
      }
    )
  }

  getPlan(profile: AccountProfile): SubscriptionPlan {
    return profile.subscriptionPlan === 'premium' ? 'premium' : 'free'
  }

  isPremium(profile: AccountProfile) {
    return this.getPlan(profile) === 'premium'
  }

  async getSubscriptionSummary(user: User) {
    const profile = await this.ensureAccountProfile(user)
    const scannerUsage = await this.getScannerUsage(user, profile)
    const recentScans = await PlantScan.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
      .limit(6)

    return {
      profile,
      plan: this.getPlan(profile),
      planLabel: this.isPremium(profile) ? 'Premium' : 'Free',
      isPremium: this.isPremium(profile),
      rewardPoints: profile.rewardPoints || 0,
      freeScannerMonthlyLimit: FREE_SCANNER_MONTHLY_LIMIT,
      premiumStartedAt: profile.premiumStartedAt,
      premiumRenewsAt: profile.premiumRenewsAt,
      scannerUsage,
      recentScans,
    }
  }

  async getScannerUsage(user: User, profile: AccountProfile) {
    const used = await this.countCurrentMonthScans(user.id)
    const limit = this.isPremium(profile)
      ? null
      : profile.scannerMonthlyLimit || FREE_SCANNER_MONTHLY_LIMIT
    const remaining = limit === null ? null : Math.max(limit - used, 0)
    const periodEnd = DateTime.now().plus({ months: 1 }).startOf('month')

    return {
      used,
      limit,
      remaining,
      unlimited: limit === null,
      periodStart: this.currentPeriodStart(),
      periodEnd,
      resetLabel: periodEnd.toFormat("MMMM d, yyyy 'at' h:mm a"),
      label: limit === null ? 'Scanner: unlimited' : `Uses left: ${remaining}/${limit}`,
    }
  }

  async canUseScanner(user: User, profile: AccountProfile) {
    const usage = await this.getScannerUsage(user, profile)

    return {
      allowed: usage.unlimited || (usage.remaining ?? 0) > 0,
      usage,
    }
  }

  async upgradeToPremium(user: User) {
    const profile = await this.ensureAccountProfile(user)
    const wasPremium = this.isPremium(profile)
    const now = DateTime.now()

    profile.merge({
      subscriptionPlan: 'premium',
      premiumStartedAt: profile.premiumStartedAt || now,
      premiumRenewsAt: now.plus({ months: 1 }),
      rewardPoints: (profile.rewardPoints || 0) + (wasPremium ? 0 : PREMIUM_SIGNUP_REWARD_POINTS),
      scannerMonthlyLimit: FREE_SCANNER_MONTHLY_LIMIT,
    })

    await profile.save()

    return profile
  }

  async downgradeToFree(user: User) {
    const profile = await this.ensureAccountProfile(user)

    profile.merge({
      subscriptionPlan: 'free',
      premiumStartedAt: null,
      premiumRenewsAt: null,
      scannerMonthlyLimit: FREE_SCANNER_MONTHLY_LIMIT,
    })

    await profile.save()

    return profile
  }

  async recordScan(input: {
    user: User
    profile: AccountProfile
    result: Record<string, any>
    imageHash: string
    premiumInsights?: Record<string, any> | null
  }) {
    const { user, profile, result, imageHash, premiumInsights } = input

    return PlantScan.create({
      userId: user.id,
      accountProfileId: profile.id,
      subscriptionPlan: this.getPlan(profile),
      species: result.species || 'Unknown plant',
      healthStatus: result.health?.status || null,
      confidence: Number(result.confidence || 0),
      reliabilityLevel: result.reliability?.level || null,
      imageHash,
      scanSummary: this.stringify({
        species: result.species,
        common_name: result.common_name,
        scientific_name: result.scientific_name,
        confidence: result.confidence,
        health: result.health,
        reliability: result.reliability,
        plant_info: result.plant_info,
        plant_education: result.plant_education,
        action_plan: result.action_plan,
      }),
      matches: this.stringify(result.matches || []),
      causes: this.stringify(result.causes || []),
      premiumInsights: this.stringify(premiumInsights),
    })
  }

  private async countCurrentMonthScans(userId: number) {
    const row = await PlantScan.query()
      .where('userId', userId)
      .where('createdAt', '>=', this.currentPeriodStart().toSQL())
      .count('* as total')
      .first()

    return Number(row?.$extras.total || 0)
  }

  private currentPeriodStart() {
    return DateTime.now().startOf('month')
  }

  private stringify(value: unknown) {
    if (value === undefined || value === null) return null

    return JSON.stringify(value)
  }
}
