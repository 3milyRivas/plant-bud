import { BaseModel, beforeSave, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ProfileReview extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reviewerUserId: number | null

  @column()
  declare gardenerProfileId: number | null

  @column()
  declare nurseryProfileId: number | null

  @column()
  declare rating: number

  @column()
  declare reviewerName: string | null

  @column()
  declare comment: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'reviewerUserId',
  })
  declare reviewer: BelongsTo<typeof User>

  @belongsTo(() => GardenerProfile)
  declare gardenerProfile: BelongsTo<typeof GardenerProfile>

  @belongsTo(() => NurseryProfile)
  declare nurseryProfile: BelongsTo<typeof NurseryProfile>

  @beforeSave()
  static normalizeRating(review: ProfileReview) {
    review.rating = Math.min(Math.max(Math.round(Number(review.rating) || 0), 0), 5)

    const targetCount = [review.gardenerProfileId, review.nurseryProfileId].filter(Boolean).length

    if (targetCount !== 1) {
      throw new Error('A profile review must belong to exactly one public profile')
    }
  }
}
