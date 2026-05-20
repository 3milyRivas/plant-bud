import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import User from '#models/user'
import NurseryProduct from '#models/nursery_product'
import ProfileReview from '#models/profile_review'
import ServiceRequest from '#models/service_request'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class NurseryProfile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare nurseryName: string

  @column()
  declare nurserySlug: string

  @column()
  declare ownerName: string

  @column()
  declare description: string | null

  @column()
  declare address: string | null

  @column()
  declare city: string | null

  @column()
  declare publicPhone: string | null

  @column()
  declare publicEmail: string | null

  @column()
  declare logoUrl: string | null

  @column()
  declare bannerUrl: string | null

  @column()
  declare openingHours: string | null

  @column()
  declare servicesOffered: string | null

  @column()
  declare paymentMethods: string | null

  @column()
  declare isActive: boolean

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

  @hasMany(() => NurseryProduct)
  declare products: HasMany<typeof NurseryProduct>

  @hasMany(() => ProfileReview)
  declare reviews: HasMany<typeof ProfileReview>

  @hasMany(() => ServiceRequest)
  declare serviceRequests: HasMany<typeof ServiceRequest>
}
