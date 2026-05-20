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
  declare address: string | null

  @column()
  declare notes: string | null

  @column()
  declare budget: number | null

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
