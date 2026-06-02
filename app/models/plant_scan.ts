import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import AccountProfile from '#models/account_profile'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class PlantScan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare accountProfileId: number | null

  @column()
  declare subscriptionPlan: 'free' | 'premium'

  @column()
  declare species: string

  @column()
  declare healthStatus: string | null

  @column()
  declare confidence: number

  @column()
  declare reliabilityLevel: string | null

  @column()
  declare imageHash: string | null

  @column()
  declare scanSummary: string | null

  @column()
  declare matches: string | null

  @column()
  declare causes: string | null

  @column()
  declare premiumInsights: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => AccountProfile)
  declare accountProfile: BelongsTo<typeof AccountProfile>

  get createdAtLabel() {
    return this.createdAt?.toFormat('LLL dd, yyyy') || 'Recent'
  }

  get summaryData() {
    return this.parseJson(this.scanSummary, {})
  }

  get premiumInsightData() {
    return this.parseJson(this.premiumInsights, null)
  }

  private parseJson(value: string | null, fallback: unknown) {
    if (!value) return fallback

    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
}
