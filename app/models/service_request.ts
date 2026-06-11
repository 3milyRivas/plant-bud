import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ServiceRequest extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clientUserId: number

  @column()
  declare gardenerProfileId: number | null

  @column()
  declare nurseryProfileId: number | null

  @column()
  declare serviceType: 'maintenance' | 'garden_design' | 'consultation' | 'delivery' | 'other'

  @column()
  declare status: 'pending' | 'accepted' | 'scheduled' | 'completed' | 'cancelled'

  @column.dateTime()
  declare scheduledFor: DateTime | null

  @column()
  declare arrivalWindowStart: string | null

  @column()
  declare arrivalWindowEnd: string | null

  @column()
  declare address: string | null

  @column()
  declare latitude: number | null

  @column()
  declare longitude: number | null

  @column()
  declare googlePlaceId: string | null

  @column.dateTime()
  declare locationRemovedAt: DateTime | null

  @column()
  declare notes: string | null

  @column()
  declare budget: number | null

  @column()
  declare paymentStatus: 'held' | 'released' | 'refunded' | null

  @column()
  declare paymentMethod: string | null

  @column()
  declare paymentBrand: string | null

  @column()
  declare paymentLastFour: string | null

  @column()
  declare heldAmount: number | null

  @column()
  declare releasedAmount: number | null

  @column()
  declare refundedAmount: number | null

  @column()
  declare pointsRedeemed: number

  @column()
  declare discountPercent: number

  @column()
  declare discountAmount: number

  @column.dateTime()
  declare pointsRefundedAt: DateTime | null

  @column.dateTime()
  declare paymentHeldAt: DateTime | null

  @column.dateTime()
  declare paymentReleasedAt: DateTime | null

  @column.dateTime()
  declare paymentRefundedAt: DateTime | null

  @column()
  declare gardenerResponse: string | null

  @column()
  declare finalAmount: number | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime()
  declare verifiedAt: DateTime | null

  @column.dateTime()
  declare clientConfirmedAt: DateTime | null

  @column.dateTime()
  declare gardenerConfirmedAt: DateTime | null

  @column()
  declare rewardPointsAwarded: number

  @column.dateTime()
  declare rewardAwardedAt: DateTime | null

  @column.dateTime()
  declare clientHiddenAt: DateTime | null

  @column.dateTime()
  declare gardenerHiddenAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'clientUserId',
  })
  declare client: BelongsTo<typeof User>

  @belongsTo(() => GardenerProfile)
  declare gardenerProfile: BelongsTo<typeof GardenerProfile>

  @belongsTo(() => NurseryProfile)
  declare nurseryProfile: BelongsTo<typeof NurseryProfile>
}
