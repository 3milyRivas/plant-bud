import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import User from '#models/user'
import GardenerService from '#models/gardener_service'
import ProfileReview from '#models/profile_review'
import ServiceRequest from '#models/service_request'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class GardenerProfile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare availabilitySchedule: string | null

  @column()
  declare servicesOffered: string | null

  @column()
  declare headline: string | null

  @column()
  declare bio: string | null

  @column()
  declare serviceArea: string | null

  @column()
  declare experienceYears: number

  @column()
  declare hourlyRate: number | null

  @column()
  declare isAvailable: boolean

  @column()
  declare publicPhone: string | null

  @column()
  declare portfolioUrl: string | null

  @column()
  declare paymentMethods: string | null

  @column()
  declare payoutPaypalEmail: string | null

  @column()
  declare payoutCardholderName: string | null

  @column()
  declare payoutCardBrand: string | null

  @column()
  declare payoutCardLastFour: string | null

  @column()
  declare ratingAverage: number

  @column()
  declare ratingCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => GardenerService)
  declare services: HasMany<typeof GardenerService>

  @hasMany(() => ProfileReview)
  declare reviews: HasMany<typeof ProfileReview>

  @hasMany(() => ServiceRequest)
  declare serviceRequests: HasMany<typeof ServiceRequest>
}
