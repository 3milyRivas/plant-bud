import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class AdminAuditLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare actorUserId: number | null

  @column()
  declare actorEmail: string

  @column()
  declare action: string

  @column()
  declare targetType: string

  @column()
  declare targetId: string | null

  @column()
  declare summary: string

  @column()
  declare ipAddress: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'actorUserId',
  })
  declare actor: BelongsTo<typeof User>
}
