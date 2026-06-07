import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import NurseryProfile from '#models/nursery_profile'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class NurseryCatalogCategory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nurseryProfileId: number

  @column()
  declare name: string

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => NurseryProfile)
  declare nurseryProfile: BelongsTo<typeof NurseryProfile>
}
