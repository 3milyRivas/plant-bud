import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import PostPoll from '#models/post_poll'
import PostPollVote from '#models/post_poll_vote'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class PostPollOption extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare postPollId: number

  @column()
  declare label: string

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => PostPoll)
  declare poll: BelongsTo<typeof PostPoll>

  @hasMany(() => PostPollVote)
  declare votes: HasMany<typeof PostPollVote>
}
