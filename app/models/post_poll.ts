import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import CommunityPost from '#models/community_post'
import PostPollOption from '#models/post_poll_option'
import PostPollVote from '#models/post_poll_vote'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class PostPoll extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare communityPostId: number

  @column()
  declare question: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CommunityPost)
  declare post: BelongsTo<typeof CommunityPost>

  @hasMany(() => PostPollOption)
  declare options: HasMany<typeof PostPollOption>

  @hasMany(() => PostPollVote)
  declare votes: HasMany<typeof PostPollVote>
}
