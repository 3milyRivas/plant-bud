import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
