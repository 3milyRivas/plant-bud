import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import PlantScan from '#models/plant_scan'
import User from '#models/user'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export const DEFAULT_PROFILE_AVATAR_URL = '/profiles/pfp.png'
export const DEFAULT_PROFILE_BANNER_URL = '/profiles/banner.png'

export default class AccountProfile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare displayName: string

  @column()
  declare avatarUrl: string | null

  @column()
  declare bannerUrl: string | null

  @column()
  declare bio: string | null

  @column()
  declare location: string | null

  @column()
  declare websiteUrl: string | null

  @column()
  declare subscriptionPlan: 'free' | 'premium'

  @column.dateTime()
  declare premiumStartedAt: DateTime | null

  @column.dateTime()
  declare premiumRenewsAt: DateTime | null

  @column()
  declare rewardPoints: number

  @column()
  declare scannerMonthlyLimit: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime()
  declare notificationsSeenAt: DateTime | null

  @column.dateTime()
  declare notificationsClearedAt: DateTime | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => PlantScan)
  declare plantScans: HasMany<typeof PlantScan>

  get isPremium() {
    return this.subscriptionPlan === 'premium'
  }

  get planLabel() {
    return this.isPremium ? 'Premium' : 'Free'
  }
}
