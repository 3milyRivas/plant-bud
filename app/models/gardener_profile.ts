import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class GardenerProfile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare availabilitySchedule: string

  @column()
  declare servicesOffered: string
}
