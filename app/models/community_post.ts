import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import User from '#models/user'
import PostComment from '#models/post_comment'
import PostReaction from '#models/post_reaction'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class CommunityPost extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare body: string

  @column()
  declare mediaUrl: string | null

  @column()
  declare mediaType: 'none' | 'image' | 'video'

  @column()
  declare visibility: 'public' | 'followers' | 'private'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => PostComment)
  declare comments: HasMany<typeof PostComment>

  @hasMany(() => PostReaction)
  declare reactions: HasMany<typeof PostReaction>
}
