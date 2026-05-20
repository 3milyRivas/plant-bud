import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import PostPoll from '#models/post_poll'
import PostPollOption from '#models/post_poll_option'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class PostPollVote extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare postPollId: number

  @column()
  declare postPollOptionId: number

  @column()
  declare userId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => PostPoll)
  declare poll: BelongsTo<typeof PostPoll>

  @belongsTo(() => PostPollOption)
  declare option: BelongsTo<typeof PostPollOption>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
