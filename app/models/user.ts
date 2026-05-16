import { BaseModel, column, beforeSave } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import hash from '@adonisjs/core/services/hash'

export default class User extends withAuthFinder(hash, {
  uids: ['email'],
  passwordColumnName: 'password',
})(BaseModel) {
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
  declare role: 'client' | 'gardener' | 'nursery'

  @column({ serializeAs: null })
  declare password: string

  @beforeSave()
  static normalizeUsername(user: User) {
    if (user.username) {
      user.username = user.username.toLowerCase().replace(/[^a-z0-9_]/g, '')
    }
  }
}
