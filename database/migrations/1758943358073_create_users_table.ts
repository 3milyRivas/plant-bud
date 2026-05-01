import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('first_name')
      table.string('last_name')
      table.string('username').unique()
      table.string('phone').nullable()
      table.string('profile_picture').nullable()
      table.enum('role', ['client', 'gardener']).defaultTo('client')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('first_name')
      table.dropColumn('last_name')
      table.dropColumn('username')
      table.dropColumn('phone')
      table.dropColumn('profile_picture')
      table.dropColumn('role')
    })
  }
}