import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import CommunityPost from '#models/community_post'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class PostHashtag extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare communityPostId: number

  @column()
  declare tag: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CommunityPost)
  declare post: BelongsTo<typeof CommunityPost>
}
