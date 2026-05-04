import { BaseModel, column } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'

export default class User extends compose(
  BaseModel,
  withAuthFinder(() => hash, {
    uids: ['email'],
    passwordColumnName: 'password',
  })
) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare first_name: string

  @column()
  declare last_name: string

  @column()
  declare username: string

  @column()
  declare email: string

  @column()
  declare phone: string | null

  @column()
  declare dui: string | null

  @column()
  declare role: 'client' | 'gardener'

  @column({ serializeAs: null })
  declare password: string
}