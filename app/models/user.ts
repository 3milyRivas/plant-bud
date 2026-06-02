import { BaseModel, column, beforeSave, hasMany, hasOne } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import AccountLink from '#models/account_link'
import AccountProfile from '#models/account_profile'
import CommunityPost from '#models/community_post'
import Follow from '#models/follow'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'
import PlantScan from '#models/plant_scan'
import ServiceRequest from '#models/service_request'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'

export default class User extends withAuthFinder(hash, {
  uids: ['email', 'username'],
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

  @column({ columnName: 'profile_picture' })
  declare profilePicture: string | null

  @column({ serializeAs: null })
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasOne(() => AccountProfile)
  declare accountProfile: HasOne<typeof AccountProfile>

  @hasMany(() => AccountLink)
  declare accountLinks: HasMany<typeof AccountLink>

  @hasOne(() => GardenerProfile)
  declare gardenerProfile: HasOne<typeof GardenerProfile>

  @hasOne(() => NurseryProfile)
  declare nurseryProfile: HasOne<typeof NurseryProfile>

  @hasMany(() => CommunityPost)
  declare posts: HasMany<typeof CommunityPost>

  @hasMany(() => Follow, {
    foreignKey: 'followerId',
  })
  declare followingLinks: HasMany<typeof Follow>

  @hasMany(() => Follow, {
    foreignKey: 'followingId',
  })
  declare followerLinks: HasMany<typeof Follow>

  @hasMany(() => ServiceRequest, {
    foreignKey: 'clientUserId',
  })
  declare serviceRequests: HasMany<typeof ServiceRequest>

  @hasMany(() => PlantScan)
  declare plantScans: HasMany<typeof PlantScan>

  get fullName() {
    return `${this.first_name} ${this.last_name}`.trim()
  }

  get initials() {
    return this.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }

  @beforeSave()
  static normalizeUsername(user: User) {
    if (user.username) {
      user.username = user.username
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, '')
        .replace(/\.{2,}/g, '.')
        .replace(/^\./g, '')
        .replace(/\.$/g, '')
        .slice(0, 30)
    }
  }
}
