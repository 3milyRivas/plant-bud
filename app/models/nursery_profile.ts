import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class NurseryProfile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare nursery_name: string

  @column()
  declare owner_name: string
}
