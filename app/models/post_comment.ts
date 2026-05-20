import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import CommunityPost from '#models/community_post'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class PostComment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare communityPostId: number

  @column()
  declare userId: number

  @column()
  declare body: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CommunityPost)
  declare post: BelongsTo<typeof CommunityPost>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
