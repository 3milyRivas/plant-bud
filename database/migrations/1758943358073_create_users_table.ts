import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateUsersTable extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('first_name', 50).notNullable()
      table.string('last_name', 50).notNullable()

      table.string('username', 50).unique().notNullable()

      table.string('email', 254).unique().notNullable()

      table.string('password').notNullable()

      table.string('phone', 20).nullable()
      table.string('dui', 20).nullable()

      table.string('profile_picture').nullable()

      table.enum('role', ['client', 'gardener']).notNullable().defaultTo('client')

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}