import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import GardenerProfile from '#models/gardener_profile'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class GardenerService extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare gardenerProfileId: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare basePrice: number | null

  @column()
  declare durationMinutes: number | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => GardenerProfile)
  declare gardenerProfile: BelongsTo<typeof GardenerProfile>
}
